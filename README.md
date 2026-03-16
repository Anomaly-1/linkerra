# Linkerra - Cross-Platform Data Transfer App

## Purpose

A cross-platform app (Windows, macOS, iOS, Android) to enable:
- Peer-to-peer infinite data transfers
- Smart bulk syncing and updates to/from external drives
- File organization workflows
- Right-click/drag-to-convert filetype functionality
- AI-powered file parsing, sorting, and junk detection

---

## Architecture Overview

| Layer         | Technology           | Notes                                      |
|--------------|----------------------|--------------------------------------------|
| UI           | Flutter              | Native UI for all platforms                |
| Backend      | Rust                 | Handles file I/O, transfers, AI, conversion|
| Bridge       | flutter_rust_bridge  | FFI bindings between Dart and Rust         |
| Storage      | SQLite or Flat Files | Stores workflows, settings, logs           |
| AI Inference | Rust (or Python FFI) | For ML parsing, classification, sorting    |

---

## Core Modules

### 1. P2P File Transfer Engine
- Written in Rust using async networking (TCP/UDP)
- Optional Iroh or custom chunked encrypted transfer
- NAT traversal, multi-device detection
- QR-code or token-based secure pairing

### 2. AI Smart File Organizer
- Parses file content and metadata
- Sorts into categories (Images, Documents, Archives, etc.)
- Learns from user feedback
- Flags duplicates and suspected junk

### 3. Drive Sync & Smart Updates
- Detects file changes in folders or drives
- Conditional syncing: updated, new, renamed
- Handles external hard drives and version tracking

### 4. File Conversion Toolset
- Uses libraries like FFMPEG, LibreOffice CLI, ImageMagick
- Supports right-click or drag-drop to convert
- Auto-detect output type or batch convert modes

### 5. Workflow System
- User-defined chained operations (rename > convert > move)
- Drag-and-drop builder interface
- Stores workflows as JSON/YAML
- Reusable and shareable workflows

---

## Platform-Specific Features

| Platform   | Unique Additions                                  |
|------------|---------------------------------------------------|
| Windows    | Right-click context menu via registry + Rust      |
| macOS      | Quick Actions + disk access permissions           |
| Android    | File sharing intents, background sync, notification |
| iOS        | Drag-drop UI and sandbox-safe features            |

---

## Dev Stack Summary

**Rust:**
- Libraries: `tokio`, `serde`, `ffmpeg-rs`, `walkdir`, `rayon`, etc.
- Use cases: File I/O, networking, sync, AI parsing, conversions

**Flutter:**
- Packages: `flutter_rust_bridge`, `file_picker`, `bloc`, `path_provider`
- Use cases: UI, drag/drop, panels, mobile gestures, workflows

**Build Tools:**
- `flutter_rust_bridge_codegen`
- `xbuild` for cross-compiling Rust
- GitHub Actions or Codemagic for CI/CD

---

## UI Pages & Flows

| Page             | Description                                           |
|------------------|-------------------------------------------------------|
| Home Dashboard   | Overview, active transfers, storage stats            |
| Device Link      | Connect devices via token or QR                       |
| Transfer Panel   | Drag-and-drop file send/receive + progress tracking  |
| Workflow Builder | Visual builder for custom workflows                  |
| Organizer        | Manual & AI-assisted file categorization             |
| Settings         | App preferences, permissions, integrations           |

---

## Development Timeline

Hopefully complete within a month or less.

---

## Security & Privacy

- End-to-end encryption on all transfers
- AI runs locally (no external upload)
- User-controlled permissions and access
- File integrity checks via hashes

---

## Future Add-Ons

- Optional cloud sync integrations
- Remote tunneling for access outside network
- Plugin API for third-party workflows or AI
- LAN drop zones for teams or groups
