"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { localeLabel, resolveTheme } from "@/lib/types";
import type { PublicMenuData } from "@/lib/types";

export function PublicMenuView({
  data,
}: {
  data: PublicMenuData;
}) {
  const theme = resolveTheme(data.branch.theme);
  const [locale, setLocale] = useState(data.locale);
  const [activeCat, setActiveCat] = useState(data.categories[0]?.id || "");

  useEffect(() => {
    // scan beacon once per session
    const key = `scankro-scan:${data.branch.id}:${data.tableNumber ?? "m"}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
    fetch("/api/t/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "scan",
        branchId: data.branch.id,
        tableNumber: data.tableNumber,
      }),
    }).finally(() => {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
    });
  }, [data.branch.id, data.tableNumber]);

  useEffect(() => {
    // persist locale cookie loosely via localStorage
    if (locale !== data.locale) {
      document.cookie = `menu_locale=${locale};path=/;max-age=31536000`;
      window.location.search = `?lang=${locale}`;
    }
  }, [locale, data.locale]);

  const cover = data.branch.coverUrl || theme.coverUrl;
  const bg = data.branch.backgroundUrl || theme.backgroundUrl;
  const socials = (data.branch.socials || {}) as Record<string, string>;

  const filteredCategories = useMemo(() => data.categories, [data.categories]);

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: theme.fontCss,
        backgroundColor: "#fafaf9",
        backgroundImage: bg ? `url(${bg})` : undefined,
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto min-h-screen max-w-lg bg-white/95 shadow-xl">
        {/* Cover */}
        <div
          className="relative px-5 pb-6 pt-10 text-white"
          style={{
            background: cover
              ? `linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.25)), url(${cover}) center/cover`
              : `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              {data.branch.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.branch.logoUrl}
                  alt=""
                  className="mb-3 h-12 w-12 rounded-full border-2 border-white/40 object-cover"
                />
              )}
              <h1 className="text-3xl font-semibold tracking-tight">{data.branch.name}</h1>
              {data.tableNumber != null && (
                <p className="mt-1 text-sm text-white/80">Table {data.tableNumber}</p>
              )}
              {data.branch.address && (
                <p className="mt-2 text-sm text-white/80">{data.branch.address}</p>
              )}
            </div>
            {data.locales.length > 1 && (
              <select
                className="rounded-md border-0 bg-white/20 px-2 py-1 text-xs text-white backdrop-blur"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
              >
                {data.locales.map((l) => (
                  <option key={l} value={l} className="text-stone-900">
                    {localeLabel(l)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Promotions */}
        {data.promotions.length > 0 && (
          <div className="space-y-2 px-4 pt-4">
            {data.promotions.map((p) => (
              <div
                key={p.id}
                className="rounded-xl px-4 py-3 text-sm font-medium text-stone-900"
                style={{ backgroundColor: `${theme.accentColor}33` }}
              >
                <p className="font-semibold" style={{ color: theme.primaryColor }}>
                  {p.title}
                </p>
                {p.description && (
                  <p className="mt-0.5 text-stone-600 font-normal">{p.description}</p>
                )}
                {(p.type === "happy_hour" || p.type === "bogo") && (
                  <p className="mt-1 text-xs text-stone-500">
                    {p.startTime} – {p.endTime}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Daily specials */}
        {data.specials.length > 0 && (
          <div className="px-4 pt-4">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: theme.primaryColor }}
            >
              Today&apos;s specials
            </p>
            <div className="mt-2 space-y-2">
              {data.specials.map((s) => {
                const name = s.menuItem?.name || s.customName || s.title || "Special";
                const price =
                  s.customPrice ?? s.menuItem?.price ?? null;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{name}</p>
                      {s.title && s.title !== name && (
                        <p className="text-xs text-amber-800">{s.title}</p>
                      )}
                    </div>
                    {price != null && (
                      <p className="font-semibold" style={{ color: theme.primaryColor }}>
                        {formatPrice(price)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category nav */}
        {filteredCategories.length > 0 && (
          <div className="sticky top-0 z-10 mt-4 flex gap-2 overflow-x-auto border-b border-stone-100 bg-white/95 px-4 py-3 backdrop-blur">
            {filteredCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCat(c.id);
                  document.getElementById(`cat-${c.id}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                  fetch("/api/t/view", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: "category_view",
                      branchId: data.branch.id,
                      categoryId: c.id,
                      tableNumber: data.tableNumber,
                    }),
                  });
                }}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors"
                style={
                  activeCat === c.id
                    ? { background: theme.primaryColor, color: "#fff" }
                    : { background: "#f5f5f4", color: "#44403c" }
                }
              >
                {c.displayName || c.name}
              </button>
            ))}
          </div>
        )}

        {/* Items */}
        <div className="space-y-8 px-4 py-6">
          {filteredCategories.length === 0 && (
            <p className="py-16 text-center text-sm text-stone-400">
              Menu coming soon.
            </p>
          )}
          {filteredCategories.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`}>
              <h2 className="text-lg font-semibold text-stone-900">
                {cat.displayName || cat.name}
              </h2>
              <div className="mt-3 space-y-3">
                {cat.items.map((item) => (
                  <article
                    key={item.id}
                    className={`flex gap-3 rounded-xl border border-stone-100 bg-white p-3 shadow-sm ${
                      !item.isAvailable ? "opacity-55" : ""
                    }`}
                    onClick={() => {
                      if (!item.isAvailable) return;
                      fetch("/api/t/view", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "item_view",
                          branchId: data.branch.id,
                          itemId: item.id,
                          tableNumber: data.tableNumber,
                        }),
                      });
                    }}
                  >
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 shrink-0 rounded-sm border"
                            style={{
                              borderColor: item.isVeg ? "#16a34a" : "#dc2626",
                              background: item.isVeg ? "#16a34a" : "#dc2626",
                            }}
                            title={item.isVeg ? "Veg" : "Non-veg"}
                          />
                          <h3 className="font-medium text-stone-900">{item.name}</h3>
                        </div>
                        <p
                          className="shrink-0 font-semibold"
                          style={{ color: theme.primaryColor }}
                        >
                          {formatPrice(item.price)}
                        </p>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-stone-500 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {item.isPopular && (
                          <span
                            className="rounded-md px-1.5 py-0.5 font-medium"
                            style={{
                              background: `${theme.accentColor}33`,
                              color: "#92400e",
                            }}
                          >
                            ★ Popular
                          </span>
                        )}
                        {item.spicyLevel > 0 && (
                          <span className="text-stone-500">
                            {"🌶".repeat(item.spicyLevel)}
                          </span>
                        )}
                        {item.prepMinutes != null && (
                          <span className="text-stone-400">~{item.prepMinutes} min</span>
                        )}
                        {!item.isAvailable && (
                          <span className="rounded-md bg-stone-200 px-1.5 py-0.5 font-medium text-stone-600">
                            Out of stock
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer contact */}
        <footer className="border-t border-stone-100 px-4 py-6 text-center text-sm text-stone-500">
          {data.branch.phone && <p>{data.branch.phone}</p>}
          <div className="mt-2 flex justify-center gap-3">
            {Object.entries(socials)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <a key={k} href={v} className="capitalize underline" target="_blank" rel="noreferrer">
                  {k}
                </a>
              ))}
          </div>
          {data.planShowBranding && (
            <p className="mt-6 text-xs text-stone-400">
              Powered by{" "}
              <Link href="/" className="font-medium text-teal-700">
                Scankro
              </Link>
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
