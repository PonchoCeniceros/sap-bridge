# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2024-12-22

### Added
- 🚀 Initial release of @ponchoceniceros/sap
- 🔗 SAP Service Layer integration with auto-reconnect
- 🗄️ SAP HANA Database connection support
- 🔄 Redis session management with automatic recovery
- 🎯 TypeScript full type support
- 🐛 Debug mode with environment-based logging
- 🎨 Colored console logs for development
- 📦 Provider pattern for easy configuration
- 🔒 TLS/SSL configuration support
- 📚 Complete API documentation and examples

### Features
- **Session Management**: Automatic session lifecycle management
- **Auto-reconnect**: Handles session expiration transparently
- **Dual Access**: Both Service Layer OData and HANA SQL queries
- **Type Safety**: Full TypeScript definitions included
- **Debug Mode**: Environment-controlled logging with colors
- **Error Handling**: Centralized error management
- **Redis Storage**: Persistent session storage via Redis

### Documentation
- Complete README with usage examples
- TypeScript API reference
- Provider pattern examples
- Debug mode configuration guide
- Environment variables documentation

### Dependencies
- @sap/hana-client: ^2.27.19
- redis: ^5.10.0
- TypeScript support: >=4.5.0

### Node.js Support
- Minimum version: >=16.0.0
- ESM module support
- Node.js 18+ recommended
