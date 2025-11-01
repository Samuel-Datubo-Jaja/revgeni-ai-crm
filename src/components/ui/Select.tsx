"use client";

import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { forwardRef } from "react";

export const SelectRoot = Select.Root;

export function SelectTrigger(props: Select.SelectTriggerProps) {
  return (
    <Select.Trigger
      {...props}
      className={[
        "inline-flex h-10 w-full items-center justify-between gap-2",
        "rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-800",
        "shadow-sm transition hover:bg-neutral-50 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        props.className ?? "",
      ].join(" ")}
    >
      <Select.Value />
      <Select.Icon>
        <ChevronDownIcon />
      </Select.Icon>
    </Select.Trigger>
  );
}

export function SelectContent(props: Select.SelectContentProps) {
  return (
    <Select.Portal>
      <Select.Content
        {...props}
        className="z-50 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        position="popper"
        sideOffset={8}
      >
        <Select.ScrollUpButton className="flex items-center justify-center p-2 text-neutral-500">
          <ChevronUpIcon />
        </Select.ScrollUpButton>
        <Select.Viewport className="p-1">
          {props.children}
        </Select.Viewport>
        <Select.ScrollDownButton className="flex items-center justify-center p-2 text-neutral-500">
          <ChevronDownIcon />
        </Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  );
}

export const SelectGroup = Select.Group;
export const SelectValue = Select.Value;

export const SelectItem = forwardRef<
  HTMLDivElement,
  Select.SelectItemProps & { label?: string }
>(function SelectItem({ children, className, ...props }, ref) {
  return (
    <Select.Item
      {...props}
      ref={ref}
      className={[
        "relative flex cursor-pointer select-none items-center justify-between",
        "rounded-lg px-3 py-2 text-sm text-neutral-800",
        "focus:bg-neutral-100 focus:outline-none data-[state=checked]:bg-indigo-50",
        className ?? "",
      ].join(" ")}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="absolute right-2">
        <CheckIcon />
      </Select.ItemIndicator>
    </Select.Item>
  );
});

export const SelectSeparator = () => (
  <div className="my-1 h-px bg-neutral-200" />
);
