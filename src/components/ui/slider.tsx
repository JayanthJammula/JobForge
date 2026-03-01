"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "./utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn("relative flex w-full touch-none items-center select-none", className)}
      style={{ height: 24 }}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        style={{
          position: "relative",
          flexGrow: 1,
          height: 6,
          width: "100%",
          borderRadius: 9999,
          backgroundColor: "#d1d5db",
          overflow: "hidden",
        }}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          style={{
            position: "absolute",
            height: "100%",
            backgroundColor: "#000",
          }}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          style={{
            display: "block",
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "#fff",
            border: "2px solid #000",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            cursor: "grab",
            outline: "none",
          }}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
