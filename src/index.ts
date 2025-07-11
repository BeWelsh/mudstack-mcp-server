import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';

//load env variables
dotenv.config();

// Create server instance
const server = new McpServer({
  name: "api-client",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

//Interface for the api token exchange
export interface AuthRequestData {
  key: string;
  secret: string;
}

async function getToken(): Promise<any> {
  const authRequestBody: AuthRequestData = {
    key: process.env.API_KEY!,
    secret: process.env.API_SECRET!,
  };

  const authUrl = `${process.env.API_BASE_URL}/auth/token`; // Don't know if this should be hardcoded

  try {
    // Create form data like the curl command
    const formData = new URLSearchParams();
    formData.append('key', authRequestBody.key);
    formData.append('secret', authRequestBody.secret);

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "x-account-id": process.env.ACCOUNT_ID!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("Authentication successful");
    return responseData;
  } catch (error) {
    console.error("Error authenticating:", error);
    throw error;
  }
}

async function accountAPIRequest<T>(endpoint: string="accounts", jwt: string): Promise<T | null> {
  try {
    // Get base URL from environment
    const baseUrl = process.env.API_BASE_URL;
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`🔑 Using token: ${jwt.substring(0, 20)}...`);
    console.log(`📡 Making request to: ${url}`);
    
    const options = {
      method: 'GET', headers: {
          'x-account-id': process.env.ACCOUNT_ID!, 
          Authorization: 'Bearer ' + jwt
      }
    };

    const response = await fetch(url, options)
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    return null;
  }
}

// tool that gets account data from mudstack
server.tool(
  "get-account-data",
  "Get daccount data from mudstack api",
  {},
  async () => {
    try {
      const endpoint = "/accounts"
      // Ensure we have a valid token
      const jwt = await getToken();

      const data = await accountAPIRequest(
        endpoint, jwt
      )
      //   const data = await makeAPIRequest(endpoint);

      if (!data) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to retrieve data from ${endpoint}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Data from ${endpoint}:\n\n${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mudstack MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

