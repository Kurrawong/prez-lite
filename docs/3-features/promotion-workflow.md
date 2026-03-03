# Promotion Workflow

Status: 🔄 In Progress

The promotion workflow moves vocabulary changes from editing through approval to production.

## High-Level Flow

```
Edit → Save → Submit for Approval → Approve/Reject → Staging → Submit for Publishing → Publish/Reject → Production
```

```
┌─────────┐     ┌──────────┐     ┌──────────────┐     ┌────────────┐
│  Edit    │────▶│  Saved   │────▶│   Staging    │────▶│ Production │
│ (local)  │     │ (branch) │     │ (workspace)  │     │  (main)    │
└─────────┘     └──────────┘     └──────────────┘     └────────────┘
     │               │                  │                    │
  Unsaved        Submit for         Submit for            Published
  changes        Approval           Publishing
                     │                  │
                 Approve ──▶        Publish ──▶
                 Reject             Reject
```

## Two Promotion Steps

| Step | From | To | Purpose |
|------|------|----|---------|
| **Step 1: Approval** | Edit branch | Workspace (staging) | Individual vocab changes reviewed |
| **Step 2: Publishing** | Workspace (staging) | Production (main) | All approved changes published together |

## Detailed UI Flow

### Toolbar Indicators (left to right)

| State | Indicator | Color | Label |
|-------|-----------|-------|-------|
| Unsaved edits | `(N) Unsaved` | amber | Always "Unsaved" |
| After save, no review | `(N) Saved` | blue | "Saved" |
| After save, review open | `(N) Pending Approval` | blue | "Pending Approval" |
| Changes in staging, no review | `(N) In Staging` | green | "In Staging" |
| Changes in staging, review open | `(N) Awaiting Publishing` | green | "Awaiting Publishing" |

### Step 1: Saved → Staging (Approval)

#### Dropdown (blue indicator)

| State | Header | Content | Action Button |
|-------|--------|---------|---------------|
| Saved, no review | "Saved changes" | Per-concept change list | "Submit for Approval" |
| Review pending | "Changes pending approval" | Per-concept change list | "Review #N" + "View" |

#### Dialog: Submit for Approval

| Element | Value |
|---------|-------|
| **Modal title** | Submit `<vocab>` Changes for Approval |
| **Description** | Submit your saved changes for review before they are included in staging. |
| **Button** | Submit for Approval |

#### Dialog: Submitted Confirmation

| Element | Value |
|---------|-------|
| **Modal title** | Approval Submitted |
| **Icon** | check-circle (green) |
| **Heading** | Submitted for approval |
| **Description** | Your changes to `<vocab>` have been submitted for review. Once approved, they will be included in staging. |
| **Button** | Done |

#### Dialog: Review (Approve/Reject)

| Element | Value |
|---------|-------|
| **Modal title** | Review `<vocab>` Changes |
| **Description** | Approve or reject changes to be included in staging. |
| **Approve button** | Approve |
| **Reject button** | Reject (requires comment) |

#### Dialog: After Approve

| Element | Value |
|---------|-------|
| **Success message** | Changes approved and included in staging |
| **Next step hint** | Your changes are now in staging, ready to be published to production. |
| **Button** | Done |

### Step 2: Staging → Production (Publishing)

#### Dropdown (green indicator)

| State | Header | Content | Action Button |
|-------|--------|---------|---------------|
| Changes in staging, no review | "Changes in staging" | Changed vocabulary list | "Submit for Publishing" |
| Review pending | "Changes awaiting publishing" | Changed vocabulary list | "Approval #N" + "View" |

#### Dialog: Submit for Publishing

| Element | Value |
|---------|-------|
| **Modal title** | Publish Staging to Production |
| **Warning** | This will publish ALL changes in staging to production. |
| **Button** | Submit for Publishing |

#### Dialog: Submitted Confirmation

| Element | Value |
|---------|-------|
| **Modal title** | Publishing Submitted |
| **Heading** | Submitted for publishing |
| **Description** | All changes in staging have been submitted for review. Once approved, they will be published to production. |
| **Button** | Done |

#### Dialog: Review (Publish/Reject)

| Element | Value |
|---------|-------|
| **Modal title** | Publish Staging to Production |
| **Publish button** | Publish to Production |
| **Reject button** | Reject (requires comment) |

#### Dialog: After Publish

| Element | Value |
|---------|-------|
| **Success message** | Changes published to production |
| **Button** | Done |

## Vocabulary Names in Publish Popover

The green indicator popover lists changed vocabularies by their display name (not filename):
- Use vocab label from metadata when available
- Fall back to slug without extension (e.g., "brands-test" not "brands-test.ttl")

## Error Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| "Failed to fetch" | Network error | Show retry button, keep dialog open |
| "Merge already in progress" | GitHub 409 | Auto-retry after 3s, up to 3 attempts |
| "Merge conflicts" | Branch diverged | Show guidance: "Conflicts need to be resolved before this can be approved" |
| "Not mergeable" | Checks failing | Show guidance: "Checks must pass before this can be approved" |
| PR already merged | Race condition | Detect and show success, refresh state |
| PR already closed | External close | Detect and refresh state |
