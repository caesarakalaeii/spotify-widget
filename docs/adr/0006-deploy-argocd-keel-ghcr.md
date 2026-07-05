# ADR-0006: Deploy via ArgoCD + Keel + ghcr on caes.ar

- **Status:** Accepted
- **Date:** 2026-07-05

## Context

The target platform (`caesar-deployment`) is a GitOps stack: ArgoCD app-of-apps + Kustomize +
SOPS/age secrets, images auto-rolled by Keel polling ghcr, TLS via cert-manager `letsencrypt-prod`,
ingress-nginx, one namespace per app. We should adopt these conventions rather than invent new ones.

## Decision

- CI builds and pushes `ghcr.io/caesarakalaeii/spotify-widget:main` on every push to `main`.
- The Deployment carries `keel.sh/policy: force` + `keel.sh/trigger: poll`, so **Keel** rolls it
  when the `:main` digest changes (~1 min).
- Manifests live in `caesar-deployment/apps/workloads/spotify-widget/` (namespace, deployment,
  service, ingress, CNPG cluster, SOPS-encrypted secret) and are registered via an ArgoCD
  `Application` at `argocd/apps/spotify-widget.yaml` (sync-wave 6, automated prune + selfHeal,
  with `ignoreDifferences` on the CNPG `Cluster` status so Argo doesn't fight the operator).
- Ingress uses `letsencrypt-prod`, `ingressClassName: nginx`, and SSE-friendly annotations
  (`proxy-buffering: off`, long read/send timeouts).
- Secrets (Spotify client id/secret, session secret, token encryption key, DB password) are
  SOPS/age-encrypted; the app runs `replicas: 1`, non-root, container port 3000.

## Consequences

- No new platform primitives; consistent with every existing workload.
- Prerequisites are out-of-repo: a DNS A record for `spotify.caes.ar` → the ingress IPs, a Spotify
  app with the two redirect URIs registered, and making the ghcr package public.
