import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { FiSun, FiMoon, FiMonitor, FiGlobe, FiMenu, FiSettings, FiLogOut} from "react-icons/fi";

const themeOptions = [
  {
    value: "light",
    labelKey: "themeToggle.light",
    icon: <FiSun className="h-4 w-4" />,
  },
  {
    value: "system",
    labelKey: "themeToggle.system",
    icon: <FiMonitor className="h-4 w-4" />,
  },
  {
    value: "dark",
    labelKey: "themeToggle.dark",
    icon: <FiMoon className="h-4 w-4"/>,
  },
  {
    value: "earth",
    labelKey: "themeToggle.earth",
    icon: <FiGlobe className="h-4 w-4" />,
  },
];

const languageOptions = [
  { code: "en", label: "English", flagUrl: "https://flagcdn.com/w40/gb.png" },
  { code: "tr", label: "Türkçe", flagUrl: "https://flagcdn.com/w40/tr.png" },
];

function MenuIcon() {
  return (
    <FiMenu className="h-4 w-4" aria-hidden="true" />
  );
}

export default function HeaderMenu() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const currentLanguage = i18n.language?.startsWith("tr") ? "tr" : "en";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="p-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10"
        aria-label={t("common.settings")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("common.settings")}
      >
        <MenuIcon />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-white shadow-xl z-50"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "0.5px solid var(--accent)",
          }}
          role="menu"
        >
          <div className="px-2 py-2">
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-1 py-1 text-sm font-medium transition-colors hover:bg-[var(--btn-bg-hover)]"
              style={{ color: "var(--text-primary)" }}
              role="menuitem"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-gray-600">
                <FiSettings className="h-4 w-4"/>
              </span>
              <span>{t("common.settings")}</span>
            </Link>
          </div>

          <div
            className="h-px bg-gradient-to-r from-transparent to-transparent"
            style={{
              backgroundImage:
                "linear-gradient(to right, transparent, var(--separator-via), transparent)",
            }}
          />

          <div className="px-3 py-2.5">
            <div
              className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              <span>{t("themeToggle.theme")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {themeOptions.map((option) => {
                const active = theme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setTheme(option.value);
                      setOpen(false);
                    }}
                    className="p-0 inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
                    title={t(option.labelKey)}
                    aria-label={t(option.labelKey)}
                    style={
                      active
                        ? { backgroundColor: "var(--accent)", color: "#ffffff" }
                        : {
                            backgroundColor: "rgba(15, 23, 42, 0.04)",
                            color: "var(--text-primary)",
                          }
                    }
                  >
                    {option.icon}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="h-px bg-gradient-to-r from-transparent to-transparent"
            style={{
              backgroundImage:
                "linear-gradient(to right, transparent, var(--separator-via), transparent)",
            }}
          />

          <div className="px-3 py-2.5">
            <div
              className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              <span>{t("language.title")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {languageOptions.map((language) => {
                const active = language.code === currentLanguage;

                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => {
                      i18n.changeLanguage(language.code);
                      setOpen(false);
                    }}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm transition-colors"
                    title={language.label}
                    aria-label={language.label}
                    style={
                      active
                        ? { backgroundColor: "var(--accent)", color: "#ffffff" }
                        : {
                            backgroundColor: "rgba(15, 23, 42, 0.04)",
                            color: "var(--text-primary)",
                          }
                    }
                  >
                    <img
                      src={language.flagUrl}
                      alt={language.label}
                      className="h-4 w-5 rounded-sm object-cover"
                    />
                    <span className="text-xs font-medium">
                      {language.code.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="h-px bg-gradient-to-r from-transparent to-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, transparent, var(--separator-via), transparent)' }}
          />

          <div className="px-2 py-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="border-0 bg-transparent flex w-full items-center gap-2.5 rounded-xl px-1 py-1 text-sm font-medium transition-colors hover:bg-[var(--btn-bg-hover)]"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-gray-600">
                <FiLogOut className="h-4 w-4" />
              </span>
              <span>{t("common.logout")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
