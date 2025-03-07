// AUCIP Protocol Implementation Example
// This demonstrates a basic AUCIP server implementation using Node.js and Express

const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Secret key for JWT signing
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// In-memory capability registry
const capabilities = [
  {
    id: "file.read",
    name: "Read File",
    description: "Reads the content of a file",
    version: "1.0",
    permissions: ["file.read"],
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path"
        }
      },
      required: ["path"]
    },
    returns: {
      type: "object",
      properties: {
        content: {
          type: "string"
        },
        size: {
          type: "number"
        }
      }
    }
  },
  {
    id: "file.write",
    name: "Write File",
    description: "Writes content to a file",
    version: "1.0",
    permissions: ["file.write"],
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path"
        },
        content: {
          type: "string",
          description: "File content"
        },
        overwrite: {
          type: "boolean",
          description: "Whether to overwrite existing file",
          default: false
        }
      },
      required: ["path", "content"]
    },
    returns: {
      type: "object",
      properties: {
        success: {
          type: "boolean"
        },
        fileId: {
          type: "string"
        }
      }
    }
  },
  {
    id: "image.process",
    name: "Process Image",
    description: "Applies filters and transformations to an image",
    version: "1.0",
    permissions: ["media.edit"],
    async: true,
    parameters: {
      type: "object",
      properties: {
        imageId: {
          type: "string",
          description: "ID of the image to process"
        },
        operations: {
          type: "array",
          description: "List of operations to perform",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["resize", "crop", "rotate", "filter"]
              },
              params: {
                type: "object"
              }
            }
          }
        }
      },
      required: ["imageId", "operations"]
    }
  }
];

// In-memory user permissions database
const userPermissions = {
  "user123": ["file.read", "file.write"],
  "user456": ["file.read", "media.edit"]
};

// Middleware to authenticate requests
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: "error",
      error: {
        code: "unauthorized",
        message: "Authentication required"
      }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      status: "error",
      error: {
        code: "invalid_token",
        message: "Invalid or expired token"
      }
    });
  }
};

// Middleware to check permissions
const checkPermission = (permission) => {
  return (req, res, next) => {
    const userId = req.user.sub;
    const userPerms = userPermissions[userId] || [];
    
    if (!userPerms.includes(permission)) {
      return res.status(403).json({
        status: "error",
        error: {
          code: "permission_denied",
          message: `Missing required permission: ${permission}`,
          details: {
            requiredPermission: permission,
            userPermissions: userPerms
          }
        }
      });
    }
    next();
  };
};

// Validate parameters against schema
const validateParams = (schema, params) => {
  // Simple validation - would use a more robust solution in production
  if (schema.required) {
    for (const field of schema.required) {
      if (params[field] === undefined) {
        return {
          valid: false,
          error: `Missing required parameter: ${field}`
        };
      }
    }
  }
  return { valid: true };
};

// ----- AUCIP Endpoints -----

// Discover capabilities
app.get('/aucip/v1/capabilities', (req, res) => {
  res.json({
    capabilities: capabilities,
    metadata: {
      app_name: "AUCIP Demo",
      app_version: "1.0.0",
      aucip_version: "0.2"
    }
  });
});

// Execute capability
app.post('/aucip/v1/execute/:capabilityId', authenticate, (req, res) => {
  const { capabilityId } = req.params;
  const { parameters, context } = req.body;
  
  // Find requested capability
  const capability = capabilities.find(cap => cap.id === capabilityId);
  if (!capability) {
    return res.status(404).json({
      status: "error",
      error: {
        code: "capability_not_found",
        message: `Capability '${capabilityId}' not found`
      }
    });
  }

  // Check permissions
  const requiredPermissions = capability.permissions || [];
  const userId = req.user.sub;
  const userPerms = userPermissions[userId] || [];
  
  const missingPermissions = requiredPermissions.filter(p => !userPerms.includes(p));
  if (missingPermissions.length > 0) {
    return res.status(403).json({
      status: "error",
      error: {
        code: "permission_denied",
        message: "Missing required permissions",
        details: {
          missingPermissions
        }
      }
    });
  }

  // Validate parameters
  const validation = validateParams(capability.parameters, parameters);
  if (!validation.valid) {
    return res.status(400).json({
      status: "error",
      error: {
        code: "invalid_parameters",
        message: validation.error
      }
    });
  }

  // Handle asynchronous capabilities
  if (capability.async) {
    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // In a real implementation, this would start a background job
    setTimeout(() => {
      console.log(`Async job ${jobId} for ${capabilityId} completed`);
    }, 5000);
    
    return res.status(202).json({
      status: "accepted",
      jobId: jobId,
      statusUrl: `/aucip/v1/jobs/${jobId}`
    });
  }

  // For demo purposes, we'll just simulate execution
  // In a real implementation, this would call actual system functions
  let result;
  
  try {
    switch (capabilityId) {
      case "file.read":
        result = {
          content: `This is the content of ${parameters.path}`,
          size: 512
        };
        break;
        
      case "file.write":
        result = {
          success: true,
          fileId: `file-${Date.now()}`
        };
        break;
        
      default:
        result = {
          success: true,
          message: `Executed ${capabilityId} with parameters: ${JSON.stringify(parameters)}`
        };
    }
    
    return res.json({
      status: "success",
      result,
      meta: {
        executionTime: 0.05,
        requestId: context?.requestId || `req-${Date.now()}`
      }
    });
    
  } catch (err) {
    return res.status(500).json({
      status: "error",
      error: {
        code: "execution_failed",
        message: err.message
      }
    });
  }
});

// Job status endpoint for async operations
app.get('/aucip/v1/jobs/:jobId', authenticate, (req, res) => {
  const { jobId } = req.params;
  
  // In a real implementation, this would check the job status
  // For demo, we'll randomly return completed or in-progress
  const random = Math.random();
  
  if (random > 0.3) {
    return res.json({
      status: "completed",
      jobId,
      result: {
        success: true,
        outputUrl: "https://example.com/results/output123.png"
      },
      completedAt: new Date().toISOString()
    });
  } else {
    return res.json({
      status: "in_progress",
      jobId,
      progress: Math.floor(random * 100),
      estimatedCompletion: new Date(Date.now() + 30000).toISOString()
    });
  }
});

// Batch operations
app.post('/aucip/v1/batch', authenticate, (req, res) => {
  const { operations, atomicity } = req.body;
  
  if (!operations || !Array.isArray(operations)) {
    return res.status(400).json({
      status: "error",
      error: {
        code: "invalid_request",
        message: "Operations must be an array"
      }
    });
  }
  
  const results = [];
  let hasErrors = false;
  
  // Process each operation
  for (const op of operations) {
    const capability = capabilities.find(cap => cap.id === op.capability);
    
    if (!capability) {
      hasErrors = true;
      results.push({
        status: "error",
        error: {
          code: "capability_not_found",
          message: `Capability '${op.capability}' not found`
        }
      });
      
      // If atomicity is all-or-nothing, fail early
      if (atomicity === "all-or-nothing") {
        break;
      }
      continue;
    }
    
    // Simulate execution
    results.push({
      status: "success",
      capability: op.capability,
      result: {
        success: true,
        operationId: `op-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      }
    });
  }
  
  if (hasErrors && atomicity === "all-or-nothing") {
    return res.status(400).json({
      status: "error",
      error: {
        code: "batch_failed",
        message: "Batch operation failed due to errors"
      },
      results
    });
  }
  
  return res.json({
    status: "success",
    results
  });
});

// Subscription API
app.post('/aucip/v1/subscribe', authenticate, (req, res) => {
  const { capabilities: requestedCapabilities, callback, events, duration } = req.body;
  
  if (!callback || !callback.startsWith('https://')) {
    return res.status(400).json({
      status: "error",
      error: {
        code: "invalid_callback",
        message: "Callback URL must use HTTPS"
      }
    });
  }
  
  // Validate requested capabilities
  const invalidCapabilities = requestedCapabilities.filter(
    capId => !capabilities.some(cap => cap.id === capId)
  );
  
  if (invalidCapabilities.length > 0) {
    return res.status(400).json({
      status: "error",
      error: {
        code: "invalid_capabilities",
        message: "Some requested capabilities do not exist",
        details: {
          invalidCapabilities
        }
      }
    });
  }
  
  const subscriptionId = `sub-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const expiresAt = Date.now() + (duration || 3600) * 1000;
  
  // In a real implementation, this would store the subscription details
  
  return res.json({
    subscriptionId,
    expiresAt: new Date(expiresAt).toISOString(),
    status: "active"
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AUCIP server running on port ${PORT}`);
});
