import { NextResponse } from "next/server";

export async function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "FinCore Localized Open API & Sandbox Banking Server",
      description: "API endpoints for the self-developed local Vietnamese Sandbox database of FinCore Wallet. Supports user auth, local bank linking, and VND transfers.",
      version: "1.0.0"
    },
    servers: [
      {
        url: "/api/v1",
        description: "Local Sandbox Server"
      }
    ],
    paths: {
      "/auth/signup": {
        post: {
          summary: "Register a new user",
          description: "Creates an Appwrite account and initialized e-wallet with 50,000,000 ₫.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SignUpRequest"
                }
              }
            }
          },
          responses: {
            "201": {
              description: "User registered successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/User"
                  }
                }
              }
            },
            "400": {
              description: "Invalid registration parameters"
            }
          }
        }
      },
      "/auth/signin": {
        post: {
          summary: "Authenticate a user",
          description: "Signs in user and returns user info.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SignInRequest"
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Authenticated successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/User"
                  }
                }
              }
            },
            "401": {
              description: "Authentication failed"
            }
          }
        }
      },
      "/banks": {
        get: {
          summary: "Get linked bank accounts",
          description: "Lists all linked Vietnamese bank accounts and their ledger balances.",
          responses: {
            "200": {
              description: "List of linked banks",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/Bank"
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: "Link a new mock bank account",
          description: "Bypasses Plaid to link a custom bank account to the user locally.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LinkBankRequest"
                }
              }
            }
          },
          responses: {
            "201": {
              description: "Bank linked successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/transfers": {
        post: {
          summary: "Initiate money transfer",
          description: "Performs instant Wallet-to-Wallet transfer or schedules a simulated Wallet-to-Bank / Bank-to-Wallet transfer.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TransferRequest"
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Transfer initiated or completed",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/TransferResponse"
                  }
                }
              }
            },
            "400": {
              description: "Insufficient balance or invalid parameters"
            }
          }
        }
      },
      "/alternative-data/risk-appetite": {
        get: {
          summary: "Calculate and fetch AI risk appetite score",
          description: "Fetches raw utility and social data from Mock APIs, processes features with Gemini, scores risk appetite via FastAPI XGBoost, and saves user risk profile.",
          responses: {
            "200": {
              description: "AI Risk Appetite score and behavioral features calculated"
            }
          }
        }
      },
      "/external/social-posts": {
        get: {
          summary: "Get Facebook Graph API posts data",
          description: "Simulates connection to Facebook Graph API v19.0 to fetch public posts of user for sentiment and interest analysis.",
          responses: {
            "200": {
              description: "Successful retrieval of social posts data"
            }
          }
        }
      },
      "/external/utility-bills": {
        get: {
          summary: "Get NGSP Utility billing data",
          description: "Connects to National Payment Portal to fetch EVN HCMC and SAWACO customer billing records for risk analysis.",
          responses: {
            "200": {
              description: "Successful retrieval of utility bills data"
            }
          }
        }
      },
      "/automations": {
        get: {
          summary: "Get active scheduled invest rules",
          responses: {
            "200": {
              description: "List of automations"
            }
          }
        },
        post: {
          summary: "Create a new automated rule",
          responses: {
            "201": {
              description: "Rule created successfully"
            }
          }
        },
        patch: {
          summary: "Toggle rule active status (ON/OFF)",
          responses: {
            "200": {
              description: "Rule updated"
            }
          }
        },
        delete: {
          summary: "Delete an automated rule",
          responses: {
            "200": {
              description: "Rule deleted"
            }
          }
        }
      }
    },
    components: {
      schemas: {
        SignUpRequest: {
          type: "object",
          required: ["email", "password", "firstName", "lastName", "phone", "address", "city", "province", "dateOfBirth", "citizenId"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            firstName: { type: "string" },
            lastName: { type: "string" },
            phone: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            province: { type: "string" },
            dateOfBirth: { type: "string", format: "date" },
            citizenId: { type: "string" }
          }
        },
        SignInRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" }
          }
        },
        LinkBankRequest: {
          type: "object",
          required: ["bankName", "accountId"],
          properties: {
            bankName: { type: "string" },
            accountId: { type: "string" }
          }
        },
        TransferRequest: {
          type: "object",
          required: ["receiverId", "amount", "description"],
          properties: {
            receiverId: { type: "string", description: "Email, Wallet ID, or Bank Account/Shareable ID of recipient" },
            amount: { type: "number" },
            description: { type: "string" },
            receiverBankId: { type: "string", description: "Optional bank ID to force bank-routing" }
          }
        },
        User: {
          type: "object",
          properties: {
            $id: { type: "string" },
            email: { type: "string" },
            userId: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            phone: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            province: { type: "string" },
            dateOfBirth: { type: "string" },
            citizenId: { type: "string" },
            balance: { type: "number" },
            walletId: { type: "string" }
          }
        },
        Bank: {
          type: "object",
          properties: {
            id: { type: "string" },
            availableBalance: { type: "number" },
            currentBalance: { type: "number" },
            institutionId: { type: "string" },
            name: { type: "string" },
            officialName: { type: "string" },
            mask: { type: "string" },
            type: { type: "string" },
            subtype: { type: "string" },
            appwriteItemId: { type: "string" },
            shareableId: { type: "string" }
          }
        },
        TransferResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            transactionId: { type: "string" },
            newWalletBalance: { type: "number" }
          }
        }
      }
    }
  };

  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
