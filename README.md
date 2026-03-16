# Linkerra - Cross-Platform Data Transfer App

## Purpose

A theoretically cross-platform app (Windows, macOS, iOS, Android) to enable:
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
