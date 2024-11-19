export const config = {
    // API endpoint (API Gateway URL serverless application)
    apiId: process.env.REACT_APP_API_ENDPOINT,

    // Auth0 Configuration
    auth0: {
        domain: process.env.REACT_APP_AUTH0_DOMAIN,  // Auth0 domain
        clientId: process.env.REACT_APP_AUTH0_CLIENT_ID,  // Auth0 client ID for the frontend app
        redirectUri: process.env.REACT_APP_AUTH0_REDIRECT_URI,  // The URL to redirect after authentication
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,  // API audience
    },
};
