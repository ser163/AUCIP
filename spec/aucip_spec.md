# AUCIP Protocol Specification v0.2

## 1. Introduction

The AI Universal Capability Interface Protocol (AUCIP) establishes a standardized communication framework between AI systems and applications across different platforms. This specification defines how AI systems can discover, query, and invoke capabilities exposed by applications in a secure, efficient, and platform-agnostic manner.

## 2. Core Concepts

### 2.1 Capability

A Capability represents a discrete function or service that an application can perform. Each capability has:
- A unique identifier
- Input parameters specification
- Output format specification
- Permission requirements
- Description and metadata

### 2.2 Capability Registry

Applications expose their capabilities through a Capability Registry, which serves as a catalog of all available functions the AI can invoke.

### 2.3 Execution Context

The environment in which capabilities are executed, including authentication state, permission scope, and session information.

## 3. Protocol Structure

AUCIP uses a RESTful architecture with JSON as the primary data format. The protocol consists of three main components:

### 3.1 Discovery API

Allows AI systems to discover available capabilities from applications.

```
GET /aucip/v1/capabilities
```

Response:
```json
{
  "capabilities": [
    {
      "id": "file.create",
      "name": "Create File",
      "description": "Creates a new file at the specified location",
      "version": "1.0",
      "permissions": ["file.write"],
      "parameters": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "File path"
          },
          "content": {
            "type": "string",
            "description": "File content"
          }
        },
        "required": ["path"]
      },
      "returns": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "fileId": {
            "type": "string"
          }
        }
      }
    }
  ],
  "metadata": {
    "app_name": "File Manager",
    "app_version": "1.2.3",
    "aucip_version": "0.2"
  }
}
```

### 3.2 Invocation API

Allows AI systems to execute capabilities.

```
POST /aucip/v1/execute/{capability_id}
```

Request:
```json
{
  "parameters": {
    "path": "/documents/report.txt",
    "content": "This is a new file."
  },
  "context": {
    "requestId": "a1b2c3d4",
    "timestamp": 1648147200
  }
}
```

Response:
```json
{
  "status": "success",
  "result": {
    "success": true,
    "fileId": "doc-12345"
  },
  "meta": {
    "executionTime": 0.05,
    "requestId": "a1b2c3d4"
  }
}
```

### 3.3 Subscription API

Allows AI systems to subscribe to events or capability status changes.

```
POST /aucip/v1/subscribe
```

Request:
```json
{
  "capabilities": ["file.create", "file.delete"],
  "callback": "https://ai-system.example.com/callback",
  "events": ["success", "error", "progress"],
  "duration": 3600
}
```

Response:
```json
{
  "subscriptionId": "sub-xyz789",
  "expiresAt": 1648150800,
  "status": "active"
}
```

## 4. Authentication & Authorization

### 4.1 Authentication Methods

AUCIP supports multiple authentication methods:

1. **OAuth 2.0** - For web applications and services
2. **API Keys** - For simple machine-to-machine interactions
3. **JWT Tokens** - For decentralized authentication

### 4.2 Permission Model

Capabilities require specific permissions which must be granted to the AI system:

```json
{
  "permissions": [
    {
      "id": "file.write",
      "description": "Ability to create and modify files",
      "scope": "user_documents"
    }
  ]
}
```

### 4.3 Capability Consent

Applications must implement user consent flows before allowing AI systems to access sensitive capabilities:

```json
{
  "consentRequired": true,
  "consentPrompt": "Allow AI Assistant to create files in your Documents folder?",
  "consentOptions": ["Allow once", "Allow always", "Deny"]
}
```

## 5. Error Handling

AUCIP uses standard HTTP status codes along with detailed error information:

```json
{
  "status": "error",
  "error": {
    "code": "permission_denied",
    "message": "The AI system does not have permission to create files",
    "details": {
      "missingPermissions": ["file.write"],
      "requestId": "a1b2c3d4"
    }
  }
}
```

## 6. Versioning & Compatibility

### 6.1 Protocol Versioning

The AUCIP protocol is versioned using semantic versioning (MAJOR.MINOR.PATCH). 

### 6.2 Capability Versioning

Individual capabilities can be versioned independently from the protocol:

```json
{
  "id": "file.create",
  "version": "1.0",
  "deprecatedVersion": false,
  "supersededBy": null
}
```

## 7. Security Considerations

### 7.1 Transport Security

All AUCIP communications MUST use TLS 1.2 or higher.

### 7.2 Input Validation

All capability parameters must be validated:

```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "pattern": "^[a-zA-Z0-9_/.-]+$",
        "maxLength": 255
      }
    }
  }
}
```

### 7.3 Rate Limiting

Applications should implement rate limiting to prevent abuse:

```json
{
  "rateLimit": {
    "maxRequests": 100,
    "window": "1m",
    "policy": "sliding"
  }
}
```

## 8. Performance Optimization

### 8.1 Asynchronous Execution

For long-running operations, capabilities should support asynchronous execution:

```json
{
  "async": true,
  "pollInterval": 5,
  "maxExecutionTime": 300
}
```

### 8.2 Batched Operations

Multiple capability invocations can be batched:

```
POST /aucip/v1/batch
```

Request:
```json
{
  "operations": [
    {
      "capability": "file.create",
      "parameters": { "path": "/doc1.txt", "content": "Hello" }
    },
    {
      "capability": "file.create",
      "parameters": { "path": "/doc2.txt", "content": "World" }
    }
  ],
  "atomicity": "all-or-nothing"
}
```

## 9. Implementation Guidelines

### 9.1 For Application Developers

1. Identify and document all capabilities your application can provide
2. Implement the AUCIP server endpoints
3. Add proper authentication and permission checks
4. Ensure proper error handling and logging

### 9.2 For AI System Developers

1. Implement the AUCIP client
2. Cache capability registry information
3. Respect rate limits and handle errors gracefully
4. Implement consent management flows

## 10. Extension Mechanisms

### 10.1 Custom Headers

Applications can use custom headers for application-specific needs:

```
X-AUCIP-App-Feature: custom_value
```

### 10.2 Capability Extensions

Capabilities can include extension fields prefixed with "x-":

```json
{
  "id": "file.create",
  "x-platform-specific": {
    "windows": {
      "maxPathLength": 260
    }
  }
}
```

## 11. Example Implementations

### 11.1 Minimal Server Implementation (Pseudocode)

```javascript
// Express.js example
const express = require('express');
const app = express();

// Capability registry
const capabilities = [
  {
    id: "file.create",
    name: "Create File",
    description: "Creates a new file",
    parameters: { /*...*/ }
  }
];

// Discovery endpoint
app.get('/aucip/v1/capabilities', (req, res) => {
  res.json({ capabilities, metadata: { app_name: "File Manager" } });
});

// Invocation endpoint
app.post('/aucip/v1/execute/:capabilityId', (req, res) => {
  const { capabilityId } = req.params;
  const { parameters } = req.body;
  
  // Find and execute capability
  // Return results or errors
});

app.listen(3000);
```

### 11.2 Client Implementation (Pseudocode)

```python
import requests

class AUCIPClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.capabilities = None
    
    def discover_capabilities(self):
        response = requests.get(
            f"{self.base_url}/aucip/v1/capabilities",
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        self.capabilities = response.json()["capabilities"]
        return self.capabilities
    
    def execute_capability(self, capability_id, parameters):
        response = requests.post(
            f"{self.base_url}/aucip/v1/execute/{capability_id}",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"parameters": parameters}
        )
        return response.json()
```

## 12. Future Directions

- **Capability Chaining**: Support for composing multiple capabilities into workflows
- **Real-time Communications**: WebSocket-based API for real-time capability execution
- **Federated Capability Discovery**: Mechanisms for discovering capabilities across multiple applications
- **Semantic Capability Description**: Using ontologies to describe capabilities semantically
