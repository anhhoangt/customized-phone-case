import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface PhoneProps extends HTMLAttributes<HTMLDivElement> {
  imgSrc: string;
  dark?: boolean;
}

const Phone = ({ imgSrc, className, dark = false, ...props }: PhoneProps) => {
  return (
    <div
      className={cn(
        "relative pointer-events-none z-50 overflow-hidden",
        className
      )}
      {...props}
    >
      {" "}
      <img
        src={
          dark
            ? "/phone-template-dark-edges.png"
            : "/phone-template-white-edges.png"
        }
        className="z-50 pointer-events-none select-none"
        alt="phone image"
      />
      <div className="-z-10 absolute inset-0">
        <img
          src={imgSrc}
          className="object-cover min-w-full min-h-full"
          alt="overlaying phone image"
        />
      </div>
    </div>
  );
};

export default Phone;
