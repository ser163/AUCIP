# AUCIP 协议规范 v0.2

## 1. 介绍

AI通用能力接口协议（AUCIP）建立了一个AI系统与不同平台应用之间的标准化通信框架。本规范定义了AI系统如何以安全、高效和平台无关的方式发现、查询和调用应用程序所暴露的能力。

## 2. 核心概念

### 2.1 能力（Capability）

能力代表应用程序可以执行的离散功能或服务。每个能力具有：
- 唯一标识符
- 输入参数规范
- 输出格式规范
- 权限要求
- 描述和元数据

### 2.2 能力注册表（Capability Registry）

应用程序通过能力注册表暴露其能力，作为AI可调用的所有可用功能的目录。

### 2.3 执行上下文（Execution Context）

能力执行的环境，包括认证状态、权限范围和会话信息。

## 3. 协议结构

AUCIP使用RESTful架构，以JSON作为主要数据格式。协议由三个主要组件组成：

### 3.1 发现API

允许AI系统从应用程序发现可用能力。

```
GET /aucip/v1/capabilities
```

响应:
```json
{
  "capabilities": [
    {
      "id": "file.create",
      "name": "创建文件",
      "description": "在指定位置创建新文件",
      "version": "1.0",
      "permissions": ["file.write"],
      "parameters": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "文件路径"
          },
          "content": {
            "type": "string",
            "description": "文件内容"
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
    "app_name": "文件管理器",
    "app_version": "1.2.3",
    "aucip_version": "0.2"
  }
}
```

### 3.2 调用API

允许AI系统执行能力。

```
POST /aucip/v1/execute/{capability_id}
```

请求:
```json
{
  "parameters": {
    "path": "/documents/report.txt",
    "content": "这是一个新文件。"
  },
  "context": {
    "requestId": "a1b2c3d4",
    "timestamp": 1648147200
  }
}
```

响应:
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

### 3.3 订阅API

允许AI系统订阅事件或能力状态变化。

```
POST /aucip/v1/subscribe
```

请求:
```json
{
  "capabilities": ["file.create", "file.delete"],
  "callback": "https://ai-system.example.com/callback",
  "events": ["success", "error", "progress"],
  "duration": 3600
}
```

响应:
```json
{
  "subscriptionId": "sub-xyz789",
  "expiresAt": 1648150800,
  "status": "active"
}
```

## 4. 认证与授权

### 4.1 认证方法

AUCIP支持多种认证方法：

1. **OAuth 2.0** - 适用于Web应用和服务
2. **API密钥** - 适用于简单的机器对机器交互
3. **JWT令牌** - 适用于去中心化认证

### 4.2 权限模型

能力需要特定权限，这些权限必须授予AI系统：

```json
{
  "permissions": [
    {
      "id": "file.write",
      "description": "创建和修改文件的能力",
      "scope": "user_documents"
    }
  ]
}
```

### 4.3 能力同意

应用程序在允许AI系统访问敏感能力之前必须实现用户同意流程：

```json
{
  "consentRequired": true,
  "consentPrompt": "允许AI助手在您的文档文件夹中创建文件吗？",
  "consentOptions": ["允许一次", "始终允许", "拒绝"]
}
```

## 5. 错误处理

AUCIP使用标准HTTP状态码以及详细的错误信息：

```json
{
  "status": "error",
  "error": {
    "code": "permission_denied",
    "message": "AI系统没有创建文件的权限",
    "details": {
      "missingPermissions": ["file.write"],
      "requestId": "a1b2c3d4"
    }
  }
}
```

## 6. 版本控制与兼容性

### 6.1 协议版本控制

AUCIP协议使用语义化版本控制（主版本.次版本.补丁版本）。

### 6.2 能力版本控制

单个能力可以独立于协议进行版本控制：

```json
{
  "id": "file.create",
  "version": "1.0",
  "deprecatedVersion": false,
  "supersededBy": null
}
```

## 7. 安全考虑

### 7.1 传输安全

所有AUCIP通信必须使用TLS 1.2或更高版本。

### 7.2 输入验证

所有能力参数必须进行验证：

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

### 7.3 速率限制

应用程序应实施速率限制以防止滥用：

```json
{
  "rateLimit": {
    "maxRequests": 100,
    "window": "1m",
    "policy": "sliding"
  }
}
```

## 8. 性能优化

### 8.1 异步执行

对于长时间运行的操作，能力应支持异步执行：

```json
{
  "async": true,
  "pollInterval": 5,
  "maxExecutionTime": 300
}
```

### 8.2 批量操作

多个能力调用可以批处理：

```
POST /aucip/v1/batch
```

请求:
```json
{
  "operations": [
    {
      "capability": "file.create",
      "parameters": { "path": "/doc1.txt", "content": "你好" }
    },
    {
      "capability": "file.create",
      "parameters": { "path": "/doc2.txt", "content": "世界" }
    }
  ],
  "atomicity": "all-or-nothing"
}
```

## 9. 实现指南

### 9.1 应用程序开发者指南

1. 识别并记录应用程序可以提供的所有能力
2. 实现AUCIP服务器端点
3. 添加适当的认证和权限检查
4. 确保正确的错误处理和日志记录

### 9.2 AI系统开发者指南

1. 实现AUCIP客户端
2. 缓存能力注册表信息
3. 尊重速率限制并优雅地处理错误
4. 实现同意管理流程

## 10. 扩展机制

### 10.1 自定义头部

应用程序可以使用自定义头部满足特定需求：

```
X-AUCIP-App-Feature: custom_value
```

### 10.2 能力扩展

能力可以包含以"x-"为前缀的扩展字段：

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

## 11. 示例实现

### 11.1 最小服务器实现（伪代码）

```javascript
// Express.js示例
const express = require('express');
const app = express();

// 能力注册表
const capabilities = [
  {
    id: "file.create",
    name: "创建文件",
    description: "创建新文件",
    parameters: { /*...*/ }
  }
];

// 发现端点
app.get('/aucip/v1/capabilities', (req, res) => {
  res.json({ capabilities, metadata: { app_name: "文件管理器" } });
});

// 调用端点
app.post('/aucip/v1/execute/:capabilityId', (req, res) => {
  const { capabilityId } = req.params;
  const { parameters } = req.body;
  
  // 查找并执行能力
  // 返回结果或错误
});

app.listen(3000);
```

### 11.2 客户端实现（伪代码）

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

## 12. 未来发展方向

- **能力链接**：支持将多个能力组合成工作流
- **实时通信**：基于WebSocket的API用于实时能力执行
- **联邦能力发现**：跨多个应用程序发现能力的机制
- **语义能力描述**：使用本体论语义描述能力
- **多语言支持**：为各种编程语言提供标准库实现
- **安全增强**：增加更强大的认证和授权机制
