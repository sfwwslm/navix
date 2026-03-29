import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./SelectField.module.css";

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  dataUi?: string;
}

/**
 * 通用下拉选择组件。
 */
const SelectField = ({
  value,
  options,
  onChange,
  disabled = false,
  dataUi,
}: SelectFieldProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  // 当前值未命中时回退到第一项，避免按钮标签出现空白。
  const activeOption = useMemo(
    () =>
      options.find((option) => option.value === value) ?? options[0] ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    // 组件内部统一处理收口时机，业务侧只需要监听 onChange。
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef} data-ui={dataUi}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        data-open={open}
        data-disabled={disabled}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.label}>{activeOption?.label ?? ""}</span>
      </button>
      <span className={styles.chevron} aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {open ? (
        <div id={menuId} className={styles.menu} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.option}
              role="option"
              data-active={option.value === value}
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default SelectField;
