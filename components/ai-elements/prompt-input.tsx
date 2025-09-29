// Re-export all components from the modular structure for backward compatibility

// Attachment management
export {
  AttachmentsContext,
  usePromptInputAttachments,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputActionAddAttachments,
  type AttachmentsContext as AttachmentsContextType,
  type PromptInputAttachmentProps,
  type PromptInputAttachmentsProps,
  type PromptInputActionAddAttachmentsProps,
} from "./prompt-input-attachments";

// Core input functionality
export {
  PromptInput,
  type PromptInputMessage,
  type PromptInputProps,
} from "./prompt-input-core";

// Text components
export {
  PromptInputBody,
  PromptInputTextarea,
  type PromptInputBodyProps,
  type PromptInputTextareaProps,
} from "./prompt-input-text";

// Toolbar and actions
export {
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  type PromptInputToolbarProps,
  type PromptInputToolsProps,
  type PromptInputButtonProps,
  type PromptInputActionMenuProps,
  type PromptInputActionMenuTriggerProps,
  type PromptInputActionMenuContentProps,
  type PromptInputActionMenuItemProps,
} from "./prompt-input-toolbar";

// Controls (submit and model select)
export {
  PromptInputSubmit,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
  type PromptInputSubmitProps,
  type PromptInputModelSelectProps,
  type PromptInputModelSelectTriggerProps,
  type PromptInputModelSelectContentProps,
  type PromptInputModelSelectItemProps,
  type PromptInputModelSelectValueProps,
} from "./prompt-input-controls";