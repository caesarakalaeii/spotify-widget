{
  # Keep this line accurate and one line long: `nix flake metadata` prints it,
  # and it is the first thing a cold agent learns about the repo.
  description = "spotify-widget -- Next.js Spotify now-playing vinyl overlay for OBS. Run `nix flake show` for the command map.";

  # nixpkgs is the only input, on purpose.
  #
  # flake-utils would buy exactly one thing here -- eachDefaultSystem -- which is
  # the three-line genAttrs below. In exchange it costs a second lock node in
  # every repo (flake-utils transitively pulls `systems`, so really two), a
  # second upstream that can break one repo and not the others, and a hardcoded
  # system list this repo cannot edit. That list is currently broken: it still
  # contains x86_64-darwin, which now throws (see `systems` below).
  #
  # nixos-unstable is the same channel the author's own NixOS config tracks, so
  # `nix develop` here and `nixos-rebuild` there resolve the same store paths and
  # share one cache.
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    # `...` rather than a closed { self, nixpkgs }: adding a second input later
    # would otherwise fail with "called with unexpected argument 'self'".
    { nixpkgs, ... }:
    let
      lib = nixpkgs.lib;

      # x86_64-darwin is deliberately absent. nixpkgs 26.11 replaced that whole
      # attribute set with `throw "Nixpkgs 26.11 has dropped support for
      # x86_64-darwin"`. genAttrs is lazy, so plain `nix develop` on Linux would
      # not notice -- it detonates later, on `nix flake check --all-systems`.
      # Add it back only against a separate nixpkgs-26.05-darwin input.
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      # Stand-in for flake-utils.lib.eachDefaultSystem. Passes `pkgs` rather than
      # a system string, because that is what every call site below wants.
      forAllSystems = f: lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      # ======================================================================
      # PER-REPO BLOCK 1 -- the toolchain
      # ======================================================================
      # Everything the commands below need. `nix flake check` realises this
      # closure, so a typo'd attr name fails at the flake gate instead of
      # surfacing as "command not found" halfway through a task.
      #
      # Explicit `pkgs.foo`, never `with pkgs; [ ... ]`: when an attr disappears
      # in a nixpkgs bump, `with` reports a bare undefined identifier with no
      # hint of which set it came from, and the name is not greppable.
      toolchain = pkgs: [
        # ---- this repo's ecosystem ----
        # nodejs_22 pinned by major to match both CI (actions/setup-node
        # node-version: 22) and the Dockerfile (node:22-alpine). Never
        # `pkgs.nodejs`: a rolling alias would invalidate every node_modules in
        # the fleet on the same afternoon, and this repo's prebuilt native
        # addons (@next/swc, @tailwindcss/oxide) are compiled per ABI.
        #
        # npm ships INSIDE the nodejs derivation -- do not add it separately.
        # There is no pnpm/yarn here: package-lock.json is the committed
        # lockfile, so `npm ci` is the only correct install path.
        pkgs.nodejs_22

        # tsc/tsserver for editors and one-off type queries. `dev-lint` still
        # goes through `npm run type-check`, which resolves the project-pinned
        # typescript out of node_modules/.bin first -- that is deliberate, the
        # project pin is the one that must agree with next's type plugin.
        pkgs.typescript
        pkgs.typescript-language-server

        # psql/pg_ctl for the dev database. The repo's documented local flow is
        # `docker compose up -d db` (postgres:17-alpine), and the opt-in
        # `RUN_DB_TESTS=1` suite needs a reachable Postgres -- neither of which a
        # container-less agent can get from docker. Same major as the compose
        # image so the wire protocol and dump format agree. No verb manages the
        # server: starting a database is stateful, and the house rule keeps that
        # out of the flake.
        pkgs.postgresql_17

        # ---- present in every repo in the fleet ----
        pkgs.git
        pkgs.jq
        pkgs.gnumake
      ];

      # ======================================================================
      # PER-REPO BLOCK 2 -- libraries that get dlopened, not linked
      # ======================================================================
      # This repo installs prebuilt native node addons -- @next/swc-linux-x64-gnu
      # (the Rust compiler core) and @tailwindcss/oxide/lightningcss. They are
      # .node files dlopened by the runtime, so neither patchelf nor the nix
      # linker ever sees them and NixOS has no /usr/lib for them to find.
      # stdenv.cc.cc.lib supplies libstdc++/libgcc_s, which is the pair that
      # breaks `next build` with "cannot open shared object file". Keep this list
      # minimal -- LD_LIBRARY_PATH is a blunt instrument.
      #
      # This fixes shared libraries only. A prebuilt *executable* out of an npm
      # package still needs a real ELF interpreter at the FHS path
      # `/lib64/ld-linux-x86-64.so.2`. That is a host setting -- stock NixOS
      # ships a stub there that exits 127 with "NixOS cannot run dynamically
      # linked executables" unless `environment.ldso` or `programs.nix-ld.enable`
      # is set -- and no project flake can supply it.
      nativeLibs = pkgs: [
        pkgs.stdenv.cc.cc.lib
        pkgs.zlib
      ];

      # ======================================================================
      # PER-REPO BLOCK 3 -- constant environment variables
      # ======================================================================
      # Only values that are constants belong here. Anything that must READ an
      # existing value (LD_LIBRARY_PATH), UNSET something (SOURCE_DATE_EPOCH) or
      # touch the work tree goes in the shellHook further down.
      #
      # This attrset is applied to BOTH surfaces -- the dev shell and every
      # `nix run` wrapper -- so a command cannot behave differently depending on
      # how it was invoked.
      envVars = pkgs: {
        # Same as the Dockerfile. Without it the first `next build` in a fresh
        # checkout prints an interactive-looking telemetry notice into whatever
        # an agent is parsing.
        NEXT_TELEMETRY_DISABLED = "1";

        # ---- Playwright ----
        # This is the one repo in the fleet that carries a real browser suite
        # (playwright.config.ts + tests/e2e/overlay.spec.ts), so it is the one
        # repo that pays for playwright-driver.browsers -- a ~1 GB closure. It is
        # deliberately NOT in the template: everything else would download it for
        # nothing.
        #
        # The version match is load-bearing and it is the thing to re-check on
        # every dependency bump. @playwright/test resolves to 1.61.1 in
        # package-lock.json and pkgs.playwright-driver is playwright-core-1.61.1
        # on the locked nixpkgs. When those two drift, the npm side looks for a
        # browser revision directory that the nix side does not ship and fails
        # with "Executable doesn't exist at .../chromium-<rev>/chrome-linux/chrome".
        # The fix is to move the npm pin or bump flake.lock until they agree --
        # never to unset SKIP_BROWSER_DOWNLOAD and let npm fetch its own, which
        # produces an unpatched binary that cannot run on NixOS at all.
        PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
        # `playwright install-deps`-style host checks look for Debian packages and
        # always fail on NixOS; the nix-built browsers already have their libs.
        PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "1";
      };

      # ======================================================================
      # PER-REPO BLOCK 4 -- the command map
      # ======================================================================
      # THE single source of truth. It generates `apps` (so `nix run .#test`
      # works), the `dev-*` wrappers on PATH inside the shell, and `dev-help`.
      # Nothing is written twice, so `nix flake show` can never disagree with
      # what `dev-test` actually runs.
      #
      # Every verb delegates to the package.json script of the same meaning, so
      # there is exactly one definition of "how this repo builds" and CI, a human
      # and an agent all run it.
      #
      # `fmt` is ABSENT on purpose: there is no prettier, no dprint and no format
      # script in this repo, so a `dev-fmt` here could only lie about rewriting
      # files. Absence is information -- `nix flake show` reports the truth.
      #
      # Two more package.json scripts are reachable in the shell but are not
      # verbs, because neither fits the fixed vocabulary and inventing a name
      # would make the map repo-specific:
      #   npm run migrate    apply migrations/*.sql (needs a reachable Postgres)
      #   npm run test:e2e   the Playwright overlay suite -- works out of the box
      #                      thanks to the PLAYWRIGHT_* vars above, but it does a
      #                      full `next build` plus a server on :3100 and takes
      #                      minutes, so it is not what `dev-test` runs.
      #
      # npm is anchored with --prefix "$REPO_ROOT" rather than trusting the
      # caller's cwd: `nix run` and `nix develop` both start wherever they were
      # invoked, and npm walking up to find package.json is a coincidence this
      # should not depend on.
      commands = pkgs: {
        setup = {
          description = "(network) install node_modules from package-lock.json";
          # `ci`, not `install`: it honours the committed lockfile exactly and
          # refuses to silently rewrite it, which is what CI does.
          text = ''npm --prefix "$REPO_ROOT" ci "$@"'';
        };
        build = {
          description = "next build -- production standalone output (needs `setup` first)";
          text = ''npm --prefix "$REPO_ROOT" run build -- "$@"'';
        };
        test = {
          description = "run the vitest unit + component suite (needs `setup` first)";
          # The `--` is what makes `nix run .#test -- --reporter=verbose` reach
          # vitest instead of being eaten by npm.
          text = ''npm --prefix "$REPO_ROOT" test -- "$@"'';
        };
        lint = {
          description = "tsc --noEmit -- the static analysis CI gates on (needs `setup` first)";
          # `npm run type-check`, and deliberately NOT `npm run lint`. That
          # script is `next lint`, which Next.js 16 removed: the argument is now
          # parsed as a project directory, so it dies with "Invalid project
          # directory provided, no such directory: <repo>/lint". Calling the
          # project's eslint directly does not rescue it either -- the FlatCompat
          # bridge in eslint.config.mjs throws "TypeError: Converting circular
          # structure to JSON" inside @eslint/eslintrc when it validates
          # eslint-config-next 16. Both failures are the repo's, not this
          # flake's: they reproduce under plain `npm run lint` with no Nix
          # involved, and .github/workflows/ci.yml only ever runs type-check and
          # test, which is why nothing has caught them. Fixing that means editing
          # package.json/eslint.config.mjs, which is out of scope for a
          # flake-only change -- so this verb runs the analysis that works rather
          # than shipping a `dev-lint` that always exits 1.
          text = ''npm --prefix "$REPO_ROOT" run type-check -- "$@"'';
        };
        run = {
          description = "next dev on http://127.0.0.1:3000 (needs .env.local + Postgres)";
          text = ''npm --prefix "$REPO_ROOT" run dev -- "$@"'';
        };
      };

      # ======================================================================
      # GENERIC MACHINERY -- byte-identical across the fleet, do not edit
      # ======================================================================

      # Prepend, never assign: a host LD_LIBRARY_PATH may be carrying something
      # the user needs, and clobbering it breaks binaries they launch from here.
      # Linux only -- on darwin the loader variable is DYLD_*, and exporting a
      # Linux-shaped value there is at best useless.
      ldPreamble =
        pkgs:
        lib.optionalString (pkgs.stdenv.hostPlatform.isLinux && nativeLibs pkgs != [ ]) ''
          export LD_LIBRARY_PATH="${lib.makeLibraryPath (nativeLibs pkgs)}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
        '';

      # Every command gets $REPO_ROOT. `nix run` and `nix develop` both start in
      # whatever directory they were invoked from, so a bare `node_modules`
      # silently forks a second environment as soon as an agent works from a
      # subdirectory. Note we do NOT cd there: commands act on the caller's cwd
      # on purpose.
      rootPreamble = ''
        REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
        export REPO_ROOT
      '';

      # One derivation per command, reused by both `apps` and the dev shell, so
      # the two can never diverge. `dev-` prefixed because a bare `test` binary
      # earlier on PATH would shadow the POSIX shell builtin and quietly break
      # every script in the repo that uses it.
      wrappers =
        pkgs:
        lib.mapAttrs (
          name: cmd:
          pkgs.writeShellApplication {
            name = "dev-${name}";
            runtimeInputs = toolchain pkgs;
            runtimeEnv = envVars pkgs;
            meta.description = cmd.description;
            text = ''
              ${rootPreamble}
              ${ldPreamble pkgs}
              ${cmd.text}
            '';
          }
        ) (commands pkgs);

      helpFor =
        pkgs:
        let
          cmds = commands pkgs;
          names = lib.attrNames cmds;
          width = lib.foldl' (a: n: lib.max a (builtins.stringLength n)) 0 names;
          pad = n: n + lib.concatStrings (lib.genList (_: " ") (width - builtins.stringLength n));
          line = n: c: "  dev-${pad n}  ${c.description}";
        in
        pkgs.writeShellApplication {
          name = "dev-help";
          meta.description = "print this repo's command map (works offline)";
          text = ''
            cat <<'EOF'
            ${lib.concatStringsSep "\n" (lib.mapAttrsToList line cmds)}
            EOF
          '';
        };
    in
    {
      # `nix flake show` -- the discovery entrypoint, and deliberately the whole
      # machine-facing contract: every app carries a meta.description, which
      # `nix flake show` prints inline and `nix flake show --json` exposes at
      # .apps.<system>.<name>.description. Pure evaluation, so an agent gets the
      # entire command map in one cheap call without reading a README.
      #
      # Do NOT invent a top-level output for this (`agentManifest`, `probeThing`
      # ...). Nix answers with `warning: unknown flake output '<name>'` on every
      # single `nix flake check`, forever.
      apps = forAllSystems (
        pkgs:
        lib.mapAttrs (name: cmd: {
          type = "app";
          program = "${(wrappers pkgs).${name}}/bin/dev-${name}";
          meta.description = cmd.description;
        }) (commands pkgs)
      );

      # `nix develop` -- the toolchain, plus a dev-<verb> for every app.
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = toolchain pkgs ++ lib.attrValues (wrappers pkgs) ++ [ (helpFor pkgs) ];

          env = envVars pkgs;

          # Some C extensions and node-gyp addons compile at -O0, where glibc's
          # _FORTIFY_SOURCE becomes a hard error instead of a warning.
          hardeningDisable = [ "fortify" ];

          shellHook = ''
            # mkShell inherits SOURCE_DATE_EPOCH=315532800 (1980-01-01) from
            # stdenv, and any zip or tarball built in here then dies with "ZIP
            # does not support timestamps before 1980".
            unset SOURCE_DATE_EPOCH

            ${rootPreamble}
            ${ldPreamble pkgs}

            # Nothing networked, nothing stateful and nothing interactive above
            # this line, and nothing below it either. No `npm install`, no
            # `docker compose up`, no migrations, no `read`, no `exec $SHELL`.
            # Bootstrapping in the hook makes a cold `nix develop -c npm test`
            # start downloading before it runs anything, on EVERY invocation --
            # the exact failure an unattended agent cannot diagnose. That is what
            # `dev-setup` is for.

            # The banner is interactive-only, and this guard is load-bearing:
            # shellHook output lands on the STDOUT of `nix develop -c <cmd>`, so
            # an unguarded echo corrupts anything parsing it
            # (`nix develop -c cat x.json | jq` fails to parse). $- is the only
            # reliable discriminator here -- it lacks `i` for `nix develop -c`
            # and has it at an interactive prompt. Do not test $PS1 (unset in
            # both) or $IN_NIX_SHELL (set in both). >&2 is the second layer, for
            # the case where a caller runs us on a pty.
            case $- in
              *i*) echo "spotify-widget dev shell -- 'dev-help' for the command map" >&2 ;;
            esac
          '';
        };
      });

      # `nix flake check` -- honest by construction. It realises the toolchain
      # closure (so a typo'd or currently-broken attr fails here) and builds
      # every wrapper, which runs shellcheck over every command text. Add real
      # test derivations beside it. NEVER add a check that always passes: an
      # agent reads "all checks passed!" as a signal, and a fake check makes
      # `nix flake check` a liar.
      #
      # Note this repo's own suites are NOT checks and must not become checks:
      # vitest needs node_modules, which needs the network.
      checks = forAllSystems (pkgs: {
        toolchain =
          pkgs.runCommand "toolchain-check"
            {
              nativeBuildInputs = toolchain pkgs ++ lib.attrValues (wrappers pkgs);
            }
            ''
              for verb in ${lib.escapeShellArgs (lib.attrNames (commands pkgs))}; do
                command -v "dev-$verb" > /dev/null || {
                  echo "dev-$verb is not on PATH" >&2
                  exit 1
                }
              done
              touch "$out"
            '';
      });

      # `nix fmt` -- formats the *Nix* in this repo; project code has no
      # formatter (see the command map). nixfmt-tree (the treefmt wrapper) rather
      # than bare nixfmt, because bare nixfmt tries to parse every path handed to
      # it and fails on non-Nix files. This file ships already formatted, so
      # `nix fmt` is a no-op rather than a diff.
      formatter = forAllSystems (pkgs: pkgs.nixfmt-tree);
    };
}
