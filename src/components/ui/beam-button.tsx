import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeamButtonProps extends ButtonProps {
  beamColor?: string;
}

export const BeamButton = React.forwardRef<HTMLButtonElement, BeamButtonProps>(
  ({ className, children, beamColor = "from-white/0 via-white/40 to-white/0", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-full group", // Pill shape enforced
          className
        )}
        {...props}
      >
        <span className="relative z-10">{children}</span>
        <div
          className={cn(
            "absolute inset-0 -translate-x-full group-hover:animate-[shimmer-beam_1.5s_infinite]",
            "bg-gradient-to-r",
            beamColor,
            "z-0"
          )}
        />
      </Button>
    );
  }
);

BeamButton.displayName = "BeamButton";

