IntelliJ Index MCP 参考文档
# IntelliJ Index MCP 参考文档

本文档提供了 IntelliJ Index MCP Server 的完整工具参考，包括所有可用的工具、参数说明和使用示例。

## 概述

IntelliJ Index MCP Server 提供了强大的代码智能操作能力，通过 IntelliJ IDEA 的索引系统实现快速、准确的代码导航、搜索、重构和诊断功能。

### 核心优势

- **速度快** - 使用 IntelliJ 的预构建索引，比文件扫描快得多
- **智能重构** - 理解代码结构，不会破坏引用关系
- **深度集成** - 直接与 JetBrains IDE 交互
- **多语言支持** - 支持 Java, Kotlin, Python, JavaScript, TypeScript, PHP, Rust

---

## 工具分类

###  代码导航工具

| 工具名称 | 功能描述 |
|---------|---------|
| [ide_find_definition](#ide_find_definition) | 查找符号的定义位置（Go to Definition） |
| [ide_find_implementations](#ide_find_implementations) | 查找接口、抽象类或抽象方法的所有实现 |
| [ide_find_super_methods](#ide_find_super_methods) | 查找方法重写或实现的父方法 |
| [ide_find_references](#ide_find_references) | 查找符号在项目中的所有引用 |
| [ide_call_hierarchy](#ide_call_hierarchy) | 构建方法/函数的调用层次结构树 |
| [ide_type_hierarchy](#ide_type_hierarchy) | 获取类或接口的完整继承层次结构 |

###  搜索工具

| 工具名称 | 功能描述 |
|---------|---------|
| [ide_find_class](#ide_find_class) | 按名称搜索类和接口 |
| [ide_find_file](#ide_find_file) | 按名称搜索文件 |
| [ide_search_text](#ide_search_text) | 使用 IDE 的词索引搜索文本 |

### 🛠️ 重构工具

| 工具名称 | 功能描述 |
|---------|---------|
| [ide_refactor_rename](#ide_refactor_rename) | 重命名符号并更新所有引用 |
| [ide_refactor_safe_delete](#ide_refactor_safe_delete) | 安全删除符号（先检查使用情况） |

###  诊断工具

| 工具名称 | 功能描述 |
|---------|---------|
| [ide_diagnostics](#ide_diagnostics) | 获取代码问题（错误、警告）和可用的快速修复 |
| [ide_index_status](#ide_index_status) | 检查 IDE 是否准备好进行代码智能操作 |

---

## 详细工具说明

###  代码导航工具

#### ide_find_definition

**功能**: 导航到符号的定义位置（Go to Definition）。当你看到一个符号引用并需要找到它的声明时使用，适用于类、方法、变量、导入等。

**支持语言**: Java, Kotlin, Python, JavaScript, TypeScript, PHP, Rust

**返回值**: 文件路径、定义位置的行/列号、代码预览、符号名称

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | string | ✅ | 相对于项目根目录的文件路径（如 `src/main/java/com/example/MyClass.java`） |
| line | integer | ✅ | 符号引用所在的行号（从 1 开始） |
| column | integer | ✅ | 该行中的列号（从 1 开始） |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在 IDE 中打开多个项目时需要 |
| fullElementPreview | boolean | ❌ | 如果为 true，返回完整的元素代码而非预览片段。默认为 false |

**使用示例**:

```json
{
  "file": "src/Main.java",
  "line": 15,
  "column": 10
}
```

**调用方式**:
```javascript
mcp_call_tool({
  serverName: "intellij-index",
  toolName: "ide_find_definition",
  arguments: JSON.stringify({
    file: "src/Main.java",
    line: 15,
    column: 10
  })
})
```

---

#### ide_find_implementations

**功能**: 查找接口、抽象类或抽象方法的所有实现。在使用抽象概念时用于发现具体的实现类。

**支持语言**: Java, Kotlin, Python, JavaScript, TypeScript, PHP, Rust

**返回值**: 实现类/方法的列表，包含文件路径、行号、类型（类/方法）

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | string | ✅ | 相对于项目根目录的文件路径 |
| line | integer | ✅ | 行号（从 1 开始） |
| column | integer | ✅ | 列号（从 1 开始） |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在打开多个项目时需要 |

**使用示例**:

```json
{
  "file": "src/Repository.java",
  "line": 8,
  "column": 18
}
```

**典型场景**:
- 查找某个接口的所有实现类
- 查找抽象方法的所有具体实现
- 在重构时了解某个抽象概念的所有实现

---

#### ide_find_super_methods

**功能**: 查找方法重写或实现的父方法。用于向上遍历继承链——从实现到接口，或从重写到原始声明。

**支持语言**: Java, Kotlin, Python, JavaScript, TypeScript, PHP

**不支持**: Rust（Rust 使用 trait 实现而非传统继承，请使用 `ide_find_definition` 或 `ide_type_hierarchy`）

**返回值**: 从直接父类（depth=1）到根类的完整继承链，包含文件位置和所在类信息

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | string | ✅ | 相对于项目根目录的文件路径 |
| line | integer | ✅ | 行号（可以是方法体内的任何一行） |
| column | integer | ✅ | 列号（可以是方法体内的任何位置） |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在打开多个项目时需要 |

**使用示例**:

```json
{
  "file": "src/UserServiceImpl.java",
  "line": 25,
  "column": 10
}
```

**典型场景**:
- 查看方法重写了哪个父类方法
- 理解继承层次结构
- 追溯接口定义

---

#### ide_find_references

**功能**: 查找符号在项目中的所有引用。在修改或删除类、方法、字段或变量之前，了解它们的使用情况。

**支持语言**: Java, Kotlin, Python, JavaScript, TypeScript, PHP, Rust

**返回值**: 文件路径、行号、上下文片段、引用类型（method_call、field_access、import 等）

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | string | ✅ | 相对于项目根目录的文件路径（如 `src/main/java/com/example/MyClass.java`） |
| line | integer | ✅ | 符号所在位置的行号（从 1 开始） |
| column | integer | ✅ | 该行中的列号（从 1 开始） |
| maxResults | integer | ❌ | 返回的最大引用数。默认 100，最大 500 |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在 IDE 中打开多个项目时需要 |

**使用示例**:

```json
{
  "file": "src/UserService.java",
  "line": 25,
  "column": 18
}
```

**典型场景**:
- 重构前检查符号的使用情况
- 理解某个方法在哪里被调用
- 查找所有使用某个字段的地方

---

#### ide_call_hierarchy

**功能**: 构建方法/函数的调用层次结构树。用于追踪执行流——找出哪些方法调用此方法（callers）或此方法调用了哪些方法（callees）。

**支持语言**: Java, Kotlin, Python, JavaScript, TypeScript, PHP, Rust

**注意**: Rust 的 "callees" 方向可能结果有限，由于 Rust 插件 PSI 解析约束；"callers" 方向工作正常。

**返回值**: 递归树，包含方法签名、文件位置和嵌套调用关系

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | string | ✅ | 相对于项目根目录的文件路径 |
| line | integer | ✅ | 行号（从 1 开始） |
| column | integer | ✅ | 列号（从 1 开始） |
| direction | string | ✅ | 方向：'callers'（调用此方法的方法）或 'callees'（此方法调用的方法） |
| depth | integer | ❌ | 遍历调用层次的深度（默认 3，最大 5） |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在打开多个项目时需要 |

**使用示例**:

```json
{
  "file": "src/Service.java",
  "line": 42,
  "column": 10,
  "direction": "callers",
  "depth": 3
}
```

**典型场景**:
- 理解方法的调用链
- 追踪错误传播路径
- 分析代码执行流程

---

#### ide_type_hierarchy

**功能**: 获取类或接口的完整继承层次结构。用于理解类关系、查找父类或发现所有子类。

**支持语言**: Java, Kotlin, Python, JavaScript, TypeScript, PHP, Rust

**Rust 注意**: 不支持 className 参数；请使用 file + line + column。

**返回值**: 目标类信息、完整的父类型链（递归）、项目中的所有子类型

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| className | string | ❌ | 完全限定类名（如 Java 的 `com.example.MyClass` 或 PHP 的 `App\\Models\\User`）。推荐——如果你知道类名，使用此参数 |
| file | string | ❌ | 相对于项目根目录的文件路径（如 `src/main/java/com/example/MyClass.java`）。与 line 和 column 一起使用 |
| line | integer | ❌ | 类定义所在的行号（从 1 开始）。使用 file 参数时必需 |
| column | integer | ❌ | 列号（从 1 开始）。使用 file 参数时必需 |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在 IDE 中打开多个项目时需要 |

**注意**: className 或（file + line + column）必须提供其中一个

**使用示例**:

```json
{
  "className": "com.example.UserService"
}
```

或

```json
{
  "file": "src/MyClass.java",
  "line": 10,
  "column": 14
}
```

**典型场景**:
- 理解类的继承层次
- 查找某个接口的所有实现类
- 探索框架的类结构

---

###  搜索工具

#### ide_find_class

**功能**: 按名称搜索类和接口。当只需要搜索类时，比 `ide_find_symbol` 更快。

**匹配规则**:
- **camelCase**: "USvc" → "UserService"
- **substring**: "Service" → "UserService"
- **wildcard**: "User*Impl" → "UserServiceImpl"

**返回值**: 匹配的类，包含完全限定名、文件路径、行号、类型（class/interface/enum）

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| query | string | ✅ | 搜索模式。支持子字符串和 camelCase 匹配 |
| includeLibraries | boolean | ❌ | 是否包含库依赖中的类。默认 false |
| limit | integer | ❌ | 返回的最大结果数。默认 25，最大 100 |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在打开多个项目时需要 |

**使用示例**:

```json
{
  "query": "UserService"
}
```

```json
{
  "query": "U*Impl",
  "includeLibraries": true
}
```

```json
{
  "query": "USvc",
  "limit": 50
}
```

**典型场景**:
- 快速查找类定义
- 使用模糊匹配找到想要的类
- 搜索框架中的类

---

#### ide_find_file

**功能**: 按名称搜索文件。使用 IDE 的文件索引实现非常快速的文件查找。

**匹配规则**:
- **camelCase**: "USJ" → "UserService.java"
- **substring**: "User" → "UserService.java"
- **wildcard**: "*Test.kt" → 所有以 Test.kt 结尾的文件

**返回值**: 匹配的文件，包含名称、路径、所在目录

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| query | string | ✅ | 文件名模式。支持子字符串和模糊匹配 |
| includeLibraries | boolean | ❌ | 是否包含库依赖中的文件。默认 false |
| limit | integer | ❌ | 返回的最大结果数。默认 25，最大 100 |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在打开多个项目时需要 |

**使用示例**:

```json
{
  "query": "UserService.java"
}
```

```json
{
  "query": "*Test.kt"
}
```

```json
{
  "query": "BG"
}
// 匹配 build.gradle
```

**典型场景**:
- 快速查找配置文件
- 搜索测试文件
- 查找资源文件

---

#### ide_search_text

**功能**: 使用 IDE 的词索引搜索文本。对于精确单词匹配，比文件扫描快得多。

**特点**:
- 使用预构建的词索引实现 O(1) 查找，而不是扫描所有文件
- 支持上下文过滤：仅在代码、注释或字符串字面量中搜索

**返回值**: 匹配的位置，包含文件、行、列、上下文片段、上下文类型

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| query | string | ✅ | 要搜索的精确单词（不是模式/正则表达式） |
| context | string | ❌ | 搜索位置："code"、"comments"、"strings"、"all"。默认 "all" |
| caseSensitive | boolean | ❌ | 区分大小写搜索。默认 true |
| limit | integer | ❌ | 返回的最大结果数。默认 100，最大 500 |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在打开多个项目时需要 |

**使用示例**:

```json
{
  "query": "ConfigManager"
}
```

```json
{
  "query": "TODO",
  "context": "comments"
}
```

```json
{
  "query": "StringUtils",
  "context": "code",
  "caseSensitive": true
}
```

**典型场景**:
- 查找某个类的使用
- 搜索 TODO 注释
- 查找字符串字面量
- 快速定位特定单词的使用

---

### 🛠️ 重构工具

#### ide_refactor_rename

**功能**: 重命名符号并更新项目中的所有引用。用于安全、语义化的重命名，正确处理所有使用情况。支持撤销（Ctrl+Z）。

**自动重命名相关元素**:
- getter/setter 方法
- 重写方法
- 构造函数参数 ↔ 字段
- 测试类

**返回值**: 受影响的文件列表和更改计数。修改源文件。

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | string | ✅ | 相对于项目根目录的文件路径。必填 |
| line | integer | ✅ | 符号所在的行号（从 1 开始）。必填 |
| column | integer | ✅ | 列号（从 1 开始）。必填 |
| newName | string | ✅ | 符号的新名称。必填 |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在打开多个项目时需要 |

**使用示例**:

```json
{
  "file": "src/UserService.java",
  "line": 15,
  "column": 18,
  "newName": "CustomerService"
}
```

**典型场景**:
- 重命名类、方法、字段
- 批量重构代码结构
- 提高代码可读性

**注意事项**:
- 自动处理所有引用，不会遗漏
- 支持 Ctrl+Z 撤销
- 会同时重命名相关的 getter/setter

---

#### ide_refactor_safe_delete

**功能**: 通过先检查使用情况来安全删除符号。在删除代码时使用，避免破坏引用。

**行为**:
- 如果存在使用情况且 force=false，返回使用情况列表而不删除
- 使用 force=true 可强制删除（可能会破坏编译）

**返回值**: 成功状态和受影响的文件，或阻塞性使用情况列表。修改源文件。

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | string | ✅ | 相对于项目根目录的文件路径。必填 |
| line | integer | ✅ | 元素所在的行号（从 1 开始）。必填 |
| column | integer | ✅ | 列号（从 1 开始）。必填 |
| force | boolean | ❌ | 即使存在使用情况也强制删除。可选，默认 false。谨慎使用！ |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在打开多个项目时需要 |

**使用示例**:

```json
{
  "file": "src/OldClass.java",
  "line": 10,
  "column": 14
}
```

```json
{
  "file": "src/OldClass.java",
  "line": 10,
  "column": 14,
  "force": true
}
```

**典型场景**:
- 删除不再使用的代码
- 清理未使用的字段/方法
- 安全重构

**工作流程**:
1. 首先调用不带 force 参数的版本
2. 检查返回的使用情况列表
3. 如果确认安全，使用 force=true 强制删除

---

###  诊断工具

#### ide_diagnostics

**功能**: 获取文件中的代码问题（错误、警告）和可用的快速修复。用于检查代码健康状况、查找编译错误或发现可用的 IDE 意图/重构。

**返回值**: 问题及其严重性（ERROR/WARNING）、位置、消息，以及指定位置可用的意图和快速修复。

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | string | ✅ | 相对于项目根目录的文件路径（如 `src/main/java/com/example/MyClass.java`）。必填 |
| line | integer | ❌ | 意图查找的行号（从 1 开始）。可选，默认 1 |
| column | integer | ❌ | 意图查找的列号（从 1 开始）。可选，默认 1 |
| startLine | integer | ❌ | 从此行开始过滤问题。可选 |
| endLine | integer | ❌ | 在此行结束过滤问题。可选 |
| project_path | string | ❌ | 项目根目录的绝对路径。仅在 IDE 中打开多个项目时需要 |

**使用示例**:

```json
{
  "file": "src/MyClass.java"
}
```

```json
{
  "file": "src/MyClass.java",
  "line": 25,
  "column": 10
}
```

```json
{
  "file": "src/MyClass.java",
  "startLine": 10,
  "endLine": 50
}
```

**典型场景**:
- 检查代码编译错误
- 查找代码警告
- 获取可用的快速修复建议
- 批量检查代码质量

---

#### ide_index_status

**功能**: 检查 IDE 是否准备好进行代码智能操作。在其他工具因索引错误而失败时使用，或在进行批量操作前验证 IDE 准备情况。

**返回值**:
- `isDumbMode`: true = 正在索引，功能受限
- `isIndexing`: 索引标志

**当 isDumbMode 为 true 时**：等待并重试——大多数工具需要索引完成。

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| project_path | string | ❌ | 项目根目录的绝对路径。仅在打开多个项目时需要 |

**使用示例**:

```json
{}
```

```json
{
  "project_path": "/path/to/project"
}
```

**典型场景**:
- 批量操作前检查索引状态
- 工具失败时诊断原因
- 确保索引完成后再进行代码分析

**建议工作流程**:
1. 调用 `ide_index_status` 检查状态
2. 如果 `isDumbMode` 为 true，等待几秒后重试
3. 确认索引完成后，再调用其他工具

---

## 通用参数说明

### project_path 参数

大多数工具都支持可选的 `project_path` 参数，用于指定项目根目录的绝对路径。

**何时需要**:
- 在 JetBrains IDE 中同时打开多个项目时
- 需要明确指定操作哪个项目时

**何时不需要**:
- IDE 中只打开一个项目时
- MCP Server 配置了默认项目路径时

**使用建议**:
- 优先提供 `project_path` 以避免歧义
- NGS 项目通常使用：`D:/aiCoding/cpmm-otscore/ngs` 或 `f:/FGitproject/cpmm-otscore/ngs`

---

## MCP 协议调用规范

### 调用流程

1. **获取工具描述**（可选但推荐）
   ```javascript
   mcp_get_tool_description({
     toolRequests: JSON.stringify([["intellij-index", "ide_find_definition"]])
   })
   ```

2. **调用工具**
   ```javascript
   mcp_call_tool({
     serverName: "intellij-index",
     toolName: "ide_find_definition",
     arguments: JSON.stringify({
       file: "src/Main.java",
       line: 15,
       column: 10
     }),
     maxOutputLength: 80000  // 默认值，可根据需要调整
   })
   ```

### 参数格式

所有参数必须作为 JSON 字符串传递给 `arguments` 参数：

```javascript
{
  "serverName": "intellij-index",
  "toolName": "ide_find_definition",
  "arguments": JSON.stringify({
    file: "src/Main.java",
    line: 15,
    column: 10
  })
}
```

### 输出长度控制

使用 `maxOutputLength` 参数控制输出的最大长度：

```javascript
{
  "maxOutputLength": 80000  // 默认值
}
```

**建议**:
- 默认值 80000 适用于大多数场景
- 如果预期返回大量数据，可以增加此值
- 减小此值可以节省 token，但可能截断结果

---

## 最佳实践

### 1. 搜索策略优先级

| 场景 | 推荐工具 | 说明 |
|-----|---------|------|
| 查找类定义 | `ide_find_class` | 快速，支持模糊匹配 |
| 查找文件 | `ide_find_file` | 最快的文件查找方式 |
| 查找符号定义 | `ide_find_definition` | 精确定位定义 |
| 查找所有引用 | `ide_find_references` | 了解使用情况 |
| 搜索文本 | `ide_search_text` | 比 grep 快得多 |

### 2. 重构安全流程

```javascript
// 步骤 1: 查找所有引用
const refs = await mcp_call_tool({
  serverName: "intellij-index",
  toolName: "ide_find_references",
  arguments: JSON.stringify({
    file: "src/MyClass.java",
    line: 10,
    column: 15
  })
})

// 步骤 2: 检查使用情况，确认安全
if (refs.length > 100) {
  console.log("警告：大量引用，请仔细检查")
}

// 步骤 3: 安全删除
await mcp_call_tool({
  serverName: "intellij-index",
  toolName: "ide_refactor_safe_delete",
  arguments: JSON.stringify({
    file: "src/MyClass.java",
    line: 10,
    column: 15,
    force: false
  })
})
```

### 3. 批量操作前检查索引

```javascript
// 步骤 1: 检查索引状态
const status = await mcp_call_tool({
  serverName: "intellij-index",
  toolName: "ide_index_status",
  arguments: JSON.stringify({})
})

// 步骤 2: 如果正在索引，等待
if (status.isDumbMode) {
  console.log("索引中，请等待...")
  await sleep(5000)
}

// 步骤 3: 执行批量操作
// ...
```

### 4. 诊断和修复

```javascript
// 步骤 1: 获取诊断信息
const diagnostics = await mcp_call_tool({
  serverName: "intellij-index",
  toolName: "ide_diagnostics",
  arguments: JSON.stringify({
    file: "src/MyClass.java"
  })
})

// 步骤 2: 分析错误和警告
diagnostics.problems.forEach(problem => {
  if (problem.severity === "ERROR") {
    console.log(`错误: ${problem.message} at ${problem.line}:${problem.column}`)
  }
})

// 步骤 3: 获取特定位置的建议
const suggestions = await mcp_call_tool({
  serverName: "intellij-index",
  toolName: "ide_diagnostics",
  arguments: JSON.stringify({
    file: "src/MyClass.java",
    line: 25,
    column: 10
  })
})
```

---

## 常见问题

### Q1: 工具调用失败，提示索引错误？

**A**: 使用 `ide_index_status` 检查索引状态。如果 `isDumbMode` 为 true，等待索引完成后再试。

### Q2: `project_path` 参数是必须的吗？

**A**: 通常不是必需的，但提供它可以避免歧义，特别是在多个项目同时打开的情况下。

### Q3: 如何选择搜索工具？

**A**:
- 搜索类：`ide_find_class`
- 搜索文件：`ide_find_file`
- 搜索文本：`ide_search_text`
- 查找定义：`ide_find_definition`
- 查找引用：`ide_find_references`

### Q4: 重命名操作可以撤销吗？

**A**: 可以。`ide_refactor_rename` 支持 Ctrl+Z 撤销操作。

### Q5: `ide_search_text` 和 `ide_find_references` 有什么区别？

**A**:
- `ide_search_text`: 搜索文本单词，更快但不理解代码语义
- `ide_find_references`: 查找符号的引用，理解代码语义，更准确

### Q6: 为什么 `ide_call_hierarchy` 的 "callees" 在 Rust 中结果有限？

**A**: 由于 Rust 插件的 PSI 解析约束，"callees" 方向可能结果有限。建议使用 "callers" 方向。

---

## 语言支持矩阵

| 工具 | Java | Kotlin | Python | JS/TS | PHP | Rust |
|-----|------|--------|--------|-------|-----|------|
| ide_find_definition | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_find_implementations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_find_super_methods | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| ide_find_references | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_call_hierarchy | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| ide_type_hierarchy | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_find_class | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_find_file | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_search_text | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_refactor_rename | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_refactor_safe_delete | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_diagnostics | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ide_index_status | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**图例**:
- ✅: 完全支持
- ⚠️: 部分支持或有限制

---

## 附录：快速参考

### 常用命令速查

```bash
# 查找类定义
ide_find_class("UserService")

# 查找文件
ide_find_file("build.gradle")

# 查找定义
ide_find_definition("src/Main.java", 15, 10)

# 查找引用
ide_find_references("src/UserService.java", 25, 18)

# 重命名
ide_refactor_rename("src/UserService.java", 15, 18, "CustomerService")

# 检查索引状态
ide_index_status()

# 获取诊断
ide_diagnostics("src/MyClass.java")
```

### 参数速查表

| 工具 | 必填参数 | 可选参数 |
|-----|---------|---------|
| ide_find_definition | file, line, column | project_path, fullElementPreview |
| ide_find_implementations | file, line, column | project_path |
| ide_find_super_methods | file, line, column | project_path |
| ide_find_references | file, line, column | maxResults, project_path |
| ide_call_hierarchy | file, line, column, direction | depth, project_path |
| ide_type_hierarchy | className 或 (file, line, column) | project_path |
| ide_find_class | query | includeLibraries, limit, project_path |
| ide_find_file | query | includeLibraries, limit, project_path |
| ide_search_text | query | context, caseSensitive, limit, project_path |
| ide_refactor_rename | file, line, column, newName | project_path |
| ide_refactor_safe_delete | file, line, column | force, project_path |
| ide_diagnostics | file | line, column, startLine, endLine, project_path |
| ide_index_status | 无 | project_path |

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-03-27 | 1.0.0 | 初始版本 - 完整的 IntelliJ Index MCP 工具参考文档 |

---

## 相关资源

- [JetBrains IDE MCP 集成](../knowledge-base/jetbrains-mcp-integration.md)
- [JetBrains IDE MCP 工具使用规范](../rules/jetbrains-ide-mcp-usage.mdc)
- [NGS 项目开发规范](../CODEBUDDY.md)

---

## 联系方式

如有疑问或需要补充内容，请联系项目团队。
