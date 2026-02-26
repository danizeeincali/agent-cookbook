/**
 * Example: Submit a new recipe to R&R system
 */

import { RRClient } from '@rr-system/client';

async function main() {
  const client = new RRClient({
    baseUrl: 'http://localhost:3000',
  });

  // Example recipe: OAuth 2.0 Authorization Code Flow with PKCE
  const recipe = {
    title: 'OAuth 2.0 Authorization Code Flow with PKCE',
    description: 'Implements a secure OAuth 2.0 authorization code flow with PKCE extension for public clients',
    tags: ['auth', 'oauth', 'security', 'pkce'],
    version: '1.0.0',
    steps: [
      {
        index: 1,
        title: 'Generate PKCE Challenge',
        spec: `Given: no inputs
When: generate a cryptographically random 32-byte code_verifier, then compute code_challenge as base64url(sha256(code_verifier))
Then: return { code_verifier: string, code_challenge: string, code_challenge_method: "S256" }
Errors: on insufficient randomness throw InsufficientEntropyError`,
        inputs: [],
        outputs: ['code_verifier: string', 'code_challenge: string', 'code_challenge_method: string'],
      },
      {
        index: 2,
        title: 'Build Authorization URL',
        spec: `Given: client_id string, redirect_uri string, code_challenge string, scope array of strings, state string (random)
When: construct authorization URL with query params: response_type=code, client_id, redirect_uri, code_challenge, code_challenge_method=S256, scope (space-separated), state
Then: return the complete authorization URL as a string
Errors: validate that redirect_uri uses HTTPS (unless localhost), throw InvalidRedirectError if not`,
        inputs: [
          'client_id: string',
          'redirect_uri: string',
          'code_challenge: string',
          'scope: string[]',
          'state: string',
        ],
        outputs: ['authorization_url: string'],
      },
      {
        index: 3,
        title: 'Exchange Code for Token',
        spec: `Given: authorization_code string, code_verifier string, token_endpoint string, client_id string, redirect_uri string
When: construct POST request to token_endpoint with grant_type=authorization_code, code=authorization_code, redirect_uri, client_id, code_verifier; set Content-Type to application/x-www-form-urlencoded
Then: parse JSON response, validate access_token is non-empty string, return { access_token: string, refresh_token?: string, expires_in: number, token_type: string }
Errors: on 400 throw InvalidCodeError with response body; on 401 throw UnauthorizedError; on network failure retry once with 1s exponential backoff`,
        inputs: [
          'authorization_code: string',
          'code_verifier: string',
          'token_endpoint: string',
          'client_id: string',
          'redirect_uri: string',
        ],
        outputs: [
          'access_token: string',
          'refresh_token?: string',
          'expires_in: number',
          'token_type: string',
        ],
      },
      {
        index: 4,
        title: 'Refresh Access Token',
        spec: `Given: refresh_token string, token_endpoint string, client_id string
When: construct POST to token_endpoint with grant_type=refresh_token, refresh_token, client_id
Then: parse response, return { access_token: string, expires_in: number, refresh_token?: string }
Errors: on 400/401 throw InvalidRefreshTokenError; clear stored refresh_token and require re-authorization`,
        inputs: ['refresh_token: string', 'token_endpoint: string', 'client_id: string'],
        outputs: ['access_token: string', 'expires_in: number', 'refresh_token?: string'],
      },
    ],
  };

  console.log('Submitting recipe to R&R system...');

  try {
    // Note: In actual implementation, this would POST to /recipes endpoint
    // For now, we'll use the client's discover method to verify the system is running
    const results = await client.discover('oauth', 1);
    console.log('System is reachable. Found recipes:', results);

    console.log('\nTo submit this recipe, POST to http://localhost:3000/recipes with:');
    console.log(JSON.stringify(recipe, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
