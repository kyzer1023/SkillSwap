import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type AnimationType = 
  | "fade-in" 
  | "slide-in-left" 
  | "slide-in-right" 
  | "slide-in-up" 
  | "slide-in-down" 
  | "blur-in" 
  | "scale-in"
  | "reveal-up";

interface AnimateInProps {
  children: React.ReactNode;
  className?: string;
  animation?: AnimationType;
  duration?: number;
  delay?: number;
  threshold?: number;
  stagger?: boolean;
  staggerDelay?: number;
  once?: boolean;
  as?: "div" | "section" | "article" | "main" | "header" | "footer" | "aside" | "nav" | "span" | "p";
}

export function AnimateIn({
  children,
  className,
  animation = "fade-in",
  duration = 0.6,
  delay = 0,
  threshold = 0.1,
  stagger = false,
  staggerDelay = 0.1,
  once = true,
  as: Component = "div",
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: "50px 0px 0px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once]);

  const getAnimationClass = () => {
    switch (animation) {
      case "fade-in":
        return "animate-fade-in";
      case "slide-in-left":
        return "animate-slide-in-left";
      case "slide-in-right":
        return "animate-slide-in-right";
      case "slide-in-up":
        return "animate-slide-in-up";
      case "slide-in-down":
        return "animate-slide-in-down";
      case "blur-in":
        return "animate-blur-in";
      case "scale-in":
        return "animate-scale-in";
      case "reveal-up":
        return "animate-reveal-up";
      default:
        return "animate-fade-in";
    }
  };

  const animationClass = getAnimationClass();

  if (stagger && React.Children.count(children) > 0) {
    return (
      <Component
        ref={ref as React.RefObject<HTMLDivElement>}
        className={cn(className)}
        style={{ opacity: isVisible ? 1 : 0 }}
      >
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child;
          
          return (
            <div
              className={isVisible ? animationClass : undefined}
              style={isVisible ? {
                animationDelay: `${delay + index * staggerDelay}s`,
                animationDuration: `${duration}s`,
                animationFillMode: "both",
              } : { opacity: 0 }}
            >
              {child}
            </div>
          );
        })}
      </Component>
    );
  }

  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(className, isVisible ? animationClass : undefined)}
      style={isVisible ? {
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        animationFillMode: "both",
      } : { opacity: 0 }}
    >
      {children}
    </Component>
  );
}

// Utility component for animating each child element separately
interface AnimateChildrenProps {
  children: React.ReactNode;
  className?: string;
  animation?: AnimationType;
  duration?: number;
  baseDelay?: number;
  staggerDelay?: number;
  threshold?: number;
  once?: boolean;
}

export function AnimateChildren({
  children,
  className,
  animation = "fade-in",
  duration = 0.6,
  baseDelay = 0,
  staggerDelay = 0.1,
  threshold = 0.1,
  once = true,
}: AnimateChildrenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: "50px 0px 0px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once]);

  const getAnimationClass = () => {
    switch (animation) {
      case "fade-in":
        return "animate-fade-in";
      case "slide-in-left":
        return "animate-slide-in-left";
      case "slide-in-right":
        return "animate-slide-in-right";
      case "slide-in-up":
        return "animate-slide-in-up";
      case "slide-in-down":
        return "animate-slide-in-down";
      case "blur-in":
        return "animate-blur-in";
      case "scale-in":
        return "animate-scale-in";
      case "reveal-up":
        return "animate-reveal-up";
      default:
        return "animate-fade-in";
    }
  };

  const animationClass = getAnimationClass();

  return (
    <div ref={ref} className={className} style={{ opacity: isVisible ? 1 : 0 }}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return (
          <div
            className={isVisible ? animationClass : undefined}
            style={isVisible ? {
              animationDelay: `${baseDelay + index * staggerDelay}s`,
              animationDuration: `${duration}s`,
              animationFillMode: "both",
            } : { opacity: 0 }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
