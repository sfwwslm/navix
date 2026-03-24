import React, { useState, useRef, useEffect } from "react";
import {
  SelectContainer,
  SelectedValue,
  ArrowIcon,
  OptionsList,
  OptionItem,
} from "./CustomSelect.styles";
import { AnimatePresence } from "framer-motion";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "请选择...",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOptionClick = (option: SelectOption) => {
    if (option.disabled) {
      return;
    }
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <SelectContainer ref={selectRef} className={className}>
      <SelectedValue $isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ArrowIcon $isOpen={isOpen} />
      </SelectedValue>

      <AnimatePresence>
        {isOpen && (
          <OptionsList
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {options.map((option) => (
              <OptionItem
                key={option.value}
                $isSelected={value === option.value}
                $isDisabled={!!option.disabled}
                onClick={() => handleOptionClick(option)}
              >
                {option.label}
              </OptionItem>
            ))}
          </OptionsList>
        )}
      </AnimatePresence>
    </SelectContainer>
  );
};

export default CustomSelect;
