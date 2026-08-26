import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  themeIds,
} from "@/config/themes";

/**
 * Inline bootstrap script — applies stored theme before paint to avoid flash.
 * Injected via next/script strategy="beforeInteractive".
 */
export const themeBootstrapScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=${JSON.stringify(DEFAULT_THEME_ID)};var a=${JSON.stringify([...themeIds])};var v=localStorage.getItem(k);document.documentElement.setAttribute("data-theme",v&&a.indexOf(v)!==-1?v:d);}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(DEFAULT_THEME_ID)});}})();`;
