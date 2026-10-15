# workflow-test

Fixtures for testing Portainer-Command proposals into Portainer GitOps
workflow deployments (reconcile engine), on a throwaway kind cluster.

- `apps/single/web.yaml`: a workflow that deploys one named file.
- `apps/dir/`: a workflow that deploys a directory. `extra/` is a subdirectory
  the engine should not apply.
- `charts/demo/`: a workflow that deploys a Helm chart.

Nothing outside the test cluster deploys these.
