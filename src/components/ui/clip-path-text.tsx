import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ClipPathTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  letterDelay?: number;
  threshold?: number;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

export function ClipPathText({
  text,
  className,
  delay = 0,
  duration = 0.5,
  letterDelay = 0.03,
  threshold = 0.1,
  as: Component = "span",
}: ClipPathTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered) {
          setIsVisible(true);
          setHasTriggered(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, hasTriggered]);

  // Split text into words to handle wrapping properly
  const words = text.split(" ");
  let charIndex = 0;

  return (
    <Component
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as React.LegacyRef<any>}
      className={cn("inline-flex flex-wrap", className)}
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-flex whitespace-nowrap">
          {word.split("").map((char, index) => {
            const currentCharIndex = charIndex++;
            return (
              <span
                key={`${wordIndex}-${index}`}
                className={cn(
                  "inline-block",
                  !isVisible && "animate-paused"
                )}
                style={{
                  animationName: "clip-slide-down",
                  animationDuration: `${duration}s`,
                  animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  animationFillMode: "both",
                  animationDelay: `${delay + currentCharIndex * letterDelay}s`,
                }}
              >
                {char}
              </span>
            );
          })}
          {wordIndex < words.length - 1 && (
            <span
              className={cn(
                "inline-block",
                !isVisible && "animate-paused"
              )}
              style={{
                animationName: "clip-slide-down",
                animationDuration: `${duration}s`,
                animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                animationFillMode: "both",
                animationDelay: `${delay + charIndex++ * letterDelay}s`,
              }}
            >
              {"\u00A0"}
            </span>
          )}
        </span>
      ))}
    </Component>
  );
}

// Gradient version for highlighted text
interface ClipPathGradientTextProps extends ClipPathTextProps {
  gradientClassName?: string;
}

export function ClipPathGradientText({
  text,
  className,
  gradientClassName = "gradient-text",
  delay = 0,
  duration = 0.5,
  letterDelay = 0.03,
  threshold = 0.1,
  as: Component = "span",
}: ClipPathGradientTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered) {
          setIsVisible(true);
          setHasTriggered(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, hasTriggered]);

  const words = text.split(" ");
  let charIndex = 0;

  return (
    <Component
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as React.LegacyRef<any>}
      className={cn("inline-flex flex-wrap", gradientClassName, className)}
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-flex whitespace-nowrap">
          {word.split("").map((char, index) => {
            const currentCharIndex = charIndex++;
            return (
              <span
                key={`${wordIndex}-${index}`}
                className={cn(
                  "inline-block",
                  !isVisible && "animate-paused"
                )}
                style={{
                  animationName: "clip-slide-down",
                  animationDuration: `${duration}s`,
                  animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  animationFillMode: "both",
                  animationDelay: `${delay + currentCharIndex * letterDelay}s`,
                }}
              >
                {char}
              </span>
            );
          })}
          {wordIndex < words.length - 1 && (
            <span
              className={cn(
                "inline-block",
                !isVisible && "animate-paused"
              )}
              style={{
                animationName: "clip-slide-down",
                animationDuration: `${duration}s`,
                animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                animationFillMode: "both",
                animationDelay: `${delay + charIndex++ * letterDelay}s`,
              }}
            >
              {"\u00A0"}
            </span>
          )}
        </span>
      ))}
    </Component>
  );
}
