export const environment = {
  production: false,
  apiUrl: '/api/v1',
  keycloak: {
    url: 'http://localhost:8180',   // Shared with JIRA-Clone (same server, realm: devsync)
    realm: 'devsync',
    clientId: 'devsync-app'
  }
};
