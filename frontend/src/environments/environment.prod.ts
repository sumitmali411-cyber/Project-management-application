export const environment = {
  production: true,
  apiUrl: '/api/v1',
  keycloak: {
    // K8s: Replace with your real domain (maps to Keycloak ingress at auth.devapp.example.com)
    url: 'https://auth.devapp.example.com',
    realm: 'devsync',
    clientId: 'devsync-app'
  }
};
