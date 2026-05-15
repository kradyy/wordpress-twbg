/**
 * Tailwind Gutenberg Bridge – Editor utilities and core block extensions.
 */
(function (wp) {
  const { addFilter } = wp.hooks;
  const registerPlugin =
    wp.plugins && typeof wp.plugins.registerPlugin === "function"
      ? wp.plugins.registerPlugin
      : null;
  const { PluginMoreMenuItem } = wp.editPost || {};
  const { Fragment, useState } = wp.element;
  const {
    Modal,
    Button,
    TextareaControl,
    PanelBody,
    FormTokenField,
    ButtonGroup,
  } = wp.components;
  const { dispatch, select, useSelect } = wp.data;
  const { __ } = wp.i18n;
  const { createBlock } = wp.blocks;
  const { InspectorControls } = wp.blockEditor || {};
  const { createHigherOrderComponent } = wp.compose || {};

  const TAILWIND_ATTRIBUTE = "twgbTailwind";
  const PREVIEW_DEVICE_TO_BREAKPOINT = {
    Desktop: "base",
    Tablet: "md",
    Mobile: "sm",
  };
  const PREVIEW_DEVICE_LABELS = {
    Desktop: "Desktop",
    Tablet: "Tablet",
    Mobile: "Mobile",
  };
  const PREVIEW_DEVICE_OPTIONS = ["Desktop", "Tablet", "Mobile"];
  const SPACING_OPTIONS = [
    "0",
    "px",
    "0.5",
    "1",
    "1.5",
    "2",
    "2.5",
    "3",
    "3.5",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "14",
    "16",
    "20",
    "24",
    "28",
    "32",
    "36",
    "40",
    "44",
    "48",
    "52",
    "56",
    "60",
    "64",
    "72",
    "80",
    "96",
  ];

  const DISPLAY_OPTIONS = [
    { label: "—", value: "" },
    { label: "Block", value: "block" },
    { label: "Inline Block", value: "inline-block" },
    { label: "Inline", value: "inline" },
    { label: "Flex", value: "flex" },
    { label: "Inline Flex", value: "inline-flex" },
    { label: "Grid", value: "grid" },
    { label: "Inline Grid", value: "inline-grid" },
    { label: "Hidden", value: "hidden" },
  ];

  const FLEX_DIRECTION_OPTIONS = [
    { label: "—", value: "" },
    { label: "Row", value: "row" },
    { label: "Column", value: "col" },
    { label: "Row Reverse", value: "row-reverse" },
    { label: "Column Reverse", value: "col-reverse" },
  ];

  const JUSTIFY_OPTIONS = [
    { label: "—", value: "" },
    { label: "Start", value: "start" },
    { label: "Center", value: "center" },
    { label: "End", value: "end" },
    { label: "Between", value: "between" },
    { label: "Around", value: "around" },
    { label: "Evenly", value: "evenly" },
  ];

  const ALIGN_OPTIONS = [
    { label: "—", value: "" },
    { label: "Start", value: "start" },
    { label: "Center", value: "center" },
    { label: "End", value: "end" },
    { label: "Stretch", value: "stretch" },
    { label: "Baseline", value: "baseline" },
  ];

  const FLEX_WRAP_OPTIONS = [
    { label: "—", value: "" },
    { label: "Wrap", value: "wrap" },
    { label: "No Wrap", value: "nowrap" },
    { label: "Wrap Reverse", value: "wrap-reverse" },
  ];

  const TAILWIND_CATEGORY_ORDER = [
    { key: "spacing", label: "Spacing" },
    { key: "sizing", label: "Sizing" },
    { key: "typography", label: "Typography" },
    { key: "layout", label: "Layout" },
    { key: "colors", label: "Colors" },
    { key: "effects", label: "Effects" },
    { key: "other", label: "Other" },
  ];
  const TAILWIND_CATEGORY_PLACEHOLDERS = {
    spacing: "e.g. mb-2 px-6 gap-4",
    sizing: "e.g. w-full max-w-7xl h-[420px]",
    typography: "e.g. text-sm font-semibold leading-tight",
    layout: "e.g. flex items-center justify-between",
    colors: "e.g. bg-white border-gray-200",
    effects: "e.g. shadow-lg opacity-80 transition",
    other: "Other utilities",
  };

  function withBlankOption(values) {
    return [{ label: "—", value: "" }].concat(
      values.map(function (v) {
        return { label: v, value: v };
      }),
    );
  }

  function mergeClassNames(existing, extra) {
    var combined = String(existing || "") + " " + String(extra || "");
    var tokens = combined.trim().split(/\s+/).filter(Boolean);
    var deduped = [];
    tokens.forEach(function (token) {
      if (deduped.indexOf(token) === -1) {
        deduped.push(token);
      }
    });
    return deduped.join(" ");
  }

  function sanitizeClassNames(classes) {
    return String(classes || "")
      .replace(/[^a-zA-Z0-9\s\-_:/.\[\]#%,!]/g, "")
      .trim();
  }

  function sanitizeClassNamesDraft(classes) {
    return String(classes || "").replace(/[^a-zA-Z0-9\s\-_:/.\[\]#%,!]/g, "");
  }

  function classStringToTokenArray(classString) {
    if (
      window.twgbUtils &&
      typeof window.twgbUtils.classStringToTokens === "function"
    ) {
      return window.twgbUtils.classStringToTokens(classString || "");
    }
    return String(classString || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function normalizeTokenArray(tokens) {
    if (!Array.isArray(tokens)) {
      return [];
    }

    var normalized = [];
    tokens.forEach(function (token) {
      var rawValue = "";
      if (typeof token === "string") {
        rawValue = token;
      } else if (token && typeof token.value === "string") {
        rawValue = token.value;
      }

      var cleaned = sanitizeClassNamesDraft(rawValue || "").trim();
      if (!cleaned) {
        return;
      }

      cleaned.split(/\s+/).forEach(function (singleToken) {
        if (singleToken && normalized.indexOf(singleToken) === -1) {
          normalized.push(singleToken);
        }
      });
    });

    return normalized;
  }

  function dedupeTokenArray(tokens) {
    var deduped = [];
    (tokens || []).forEach(function (token) {
      var cleaned = sanitizeClassNamesDraft(token || "").trim();
      if (cleaned && deduped.indexOf(cleaned) === -1) {
        deduped.push(cleaned);
      }
    });
    return deduped;
  }

  function getTailwindUtilityPart(token) {
    var value = String(token || "").trim();
    var depth = 0;
    var lastSeparator = -1;
    var i;
    if (!value) {
      return "";
    }
    for (i = 0; i < value.length; i++) {
      if (value[i] === "[") {
        depth++;
      } else if (value[i] === "]" && depth > 0) {
        depth--;
      } else if (value[i] === ":" && depth === 0) {
        lastSeparator = i;
      }
    }
    return lastSeparator === -1 ? value : value.slice(lastSeparator + 1);
  }

  function isImportantTailwindToken(token) {
    var value = String(token || "").trim();
    var utility = getTailwindUtilityPart(value);
    return (
      value.charAt(0) === "!" ||
      utility.charAt(0) === "!" ||
      utility.charAt(utility.length - 1) === "!"
    );
  }

  function normalizeTailwindUtilityPart(token) {
    var utility = getTailwindUtilityPart(token);
    if (utility.charAt(0) === "!") {
      utility = utility.slice(1);
    }
    if (utility.charAt(utility.length - 1) === "!") {
      utility = utility.slice(0, -1);
    }
    return utility;
  }

  function detectTailwindCategory(token) {
    var utility = normalizeTailwindUtilityPart(token);

    if (
      /^(?:-?m[trblxy]?|p[trblxy]?|gap(?:-[xy])?|space-[xy]|divide-[xy])-/.test(
        utility,
      )
    ) {
      return "spacing";
    }

    if (/^(?:w-|h-|min-w-|min-h-|max-w-|max-h-|size-|aspect-)/.test(utility)) {
      return "sizing";
    }

    if (
      /^(?:text-|font-|leading-|tracking-|underline$|line-through$|no-underline$|italic$|not-italic$|uppercase$|lowercase$|capitalize$|normal-case$|whitespace-|break-|truncate$|antialiased$|subpixel-antialiased$|decoration-|align-)/.test(
        utility,
      )
    ) {
      return "typography";
    }

    if (
      /^(?:block$|inline$|inline-block$|flex$|inline-flex$|grid$|inline-grid$|hidden$|table$|contents$|flow-root$|relative$|absolute$|fixed$|sticky$|top-|right-|bottom-|left-|inset(?:-[xy])?-|z-|order-|col-|row-|justify-|items-|content-|self-|place-|object-|overflow-|float-|clear-|isolation-|box-)/.test(
        utility,
      )
    ) {
      return "layout";
    }

    if (
      /^(?:bg-|text-|border-|outline-|ring-|fill-|stroke-|from-|via-|to-)/.test(
        utility,
      )
    ) {
      return "colors";
    }

    if (
      /^(?:shadow$|shadow-|opacity-|mix-blend-|bg-blend-|filter$|blur-|brightness-|contrast-|drop-shadow-|grayscale-|hue-rotate-|invert-|saturate-|sepia-|backdrop-|transition$|transition-|duration-|ease-|delay-|animate-|transform$|scale-|rotate-|translate-|skew-)/.test(
        utility,
      )
    ) {
      return "effects";
    }

    return "other";
  }

  function groupTailwindTokens(tokens) {
    var grouped = {};
    TAILWIND_CATEGORY_ORDER.forEach(function (group) {
      grouped[group.key] = [];
    });

    (tokens || []).forEach(function (token) {
      var key = detectTailwindCategory(token);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(token);
    });

    return grouped;
  }

  function getCategorySuggestions(categoryKey, inputValue) {
    var pool = [];

    if (
      window.twgbUtils &&
      typeof window.twgbUtils.getAllTailwindClassSuggestions === "function"
    ) {
      pool = window.twgbUtils.getAllTailwindClassSuggestions();
    } else if (
      window.twgbUtils &&
      typeof window.twgbUtils.getTailwindClassSuggestions === "function"
    ) {
      pool = window.twgbUtils.getTailwindClassSuggestions("");
    }

    var needle = String(inputValue || "").trim().toLowerCase();
    return pool
      .filter(function (token) {
        if (detectTailwindCategory(token) !== categoryKey) {
          return false;
        }
        if (!needle) {
          return true;
        }
        return token.toLowerCase().indexOf(needle) !== -1;
      })
      .slice(0, 160);
  }

  function isNonEmptyUserValue(value) {
    if (value === null || typeof value === "undefined") {
      return false;
    }
    if (typeof value === "string") {
      return value.trim() !== "";
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return true;
    }
    if (Array.isArray(value)) {
      return value.some(isNonEmptyUserValue);
    }
    if (typeof value === "object") {
      return Object.keys(value).some(function (key) {
        return isNonEmptyUserValue(value[key]);
      });
    }
    return false;
  }

  function getPathValue(source, path) {
    var current = source;
    var i;
    for (i = 0; i < path.length; i++) {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      current = current[path[i]];
    }
    return current;
  }

  function blockUsesAlignAsTextAlign(blockName) {
    return (
      [
        "core/paragraph",
        "core/heading",
        "core/list",
        "core/list-item",
        "core/quote",
        "core/pullquote",
        "core/verse",
        "core/preformatted",
      ].indexOf(blockName) !== -1
    );
  }

  function getGutenbergUserConflictGroups(attrs, blockName) {
    var groups = {};
    var align = attrs && typeof attrs.align === "string" ? attrs.align : "";

    if (
      isNonEmptyUserValue(attrs && attrs.textColor) ||
      isNonEmptyUserValue(getPathValue(attrs, ["style", "color", "text"]))
    ) {
      groups.textColor = true;
    }

    if (
      isNonEmptyUserValue(attrs && attrs.backgroundColor) ||
      isNonEmptyUserValue(attrs && attrs.gradient) ||
      isNonEmptyUserValue(getPathValue(attrs, ["style", "color", "background"])) ||
      isNonEmptyUserValue(getPathValue(attrs, ["style", "color", "gradient"]))
    ) {
      groups.backgroundColor = true;
    }

    if (
      isNonEmptyUserValue(attrs && attrs.fontSize) ||
      isNonEmptyUserValue(getPathValue(attrs, ["style", "typography", "fontSize"]))
    ) {
      groups.fontSize = true;
    }

    if (
      isNonEmptyUserValue(attrs && attrs.textAlign) ||
      (blockUsesAlignAsTextAlign(blockName) &&
        /^(left|center|right|justify|start|end)$/.test(align))
    ) {
      groups.textAlign = true;
    }

    if (isNonEmptyUserValue(getPathValue(attrs, ["style", "spacing", "padding"]))) {
      groups.padding = true;
    }

    if (isNonEmptyUserValue(getPathValue(attrs, ["style", "spacing", "margin"]))) {
      groups.margin = true;
    }

    if (isNonEmptyUserValue(getPathValue(attrs, ["style", "spacing", "blockGap"]))) {
      groups.gap = true;
    }

    if (isNonEmptyUserValue(getPathValue(attrs, ["style", "border", "radius"]))) {
      groups.borderRadius = true;
    }

    return groups;
  }

  function isTailwindLengthValue(value) {
    var normalized = String(value || "");
    var arbitraryMatch = normalized.match(/^\[(.+)\]$/);
    if (arbitraryMatch) {
      normalized = arbitraryMatch[1];
    }
    return (
      /^-?\d*\.?\d+(px|rem|em|%|vw|vh|svw|svh|lvw|lvh|dvw|dvh|ch|ex|lh|rlh)$/.test(
        normalized,
      ) || /^(calc|clamp|min|max)\(/.test(normalized)
    );
  }

  function isBackgroundColorUtility(utility) {
    var value;
    if (!/^bg-/.test(utility)) {
      return false;
    }
    value = utility.slice(3);
    if (/^\[(url|image|position|size|length):/i.test(value)) {
      return false;
    }
    if (/^\[url\(/i.test(value)) {
      return false;
    }
    return !/^(auto|cover|contain|fixed|local|scroll|center|top|bottom|left|right|no-repeat|repeat|repeat-x|repeat-y|repeat-round|repeat-space|clip-|origin-|blend-)/.test(
      value,
    );
  }

  function classifyTailwindConflictGroup(token) {
    var utility = normalizeTailwindUtilityPart(token);
    var textMatch;

    if (/^-?(?:p|px|py|pt|pr|pb|pl|ps|pe)-/.test(utility)) {
      return "padding";
    }
    if (/^-?(?:m|mx|my|mt|mr|mb|ml|ms|me)-/.test(utility)) {
      return "margin";
    }
    if (/^gap(?:-[xy])?-/.test(utility)) {
      return "gap";
    }
    if (/^rounded(?:-|$)/.test(utility)) {
      return "borderRadius";
    }
    if (/^text-(left|center|right|justify|start|end)$/.test(utility)) {
      return "textAlign";
    }

    textMatch = utility.match(/^text-(.+)$/);
    if (textMatch) {
      if (
        [
          "xs",
          "sm",
          "base",
          "lg",
          "xl",
          "2xl",
          "3xl",
          "4xl",
          "5xl",
          "6xl",
          "7xl",
          "8xl",
          "9xl",
        ].indexOf(textMatch[1]) !== -1 ||
        isTailwindLengthValue(textMatch[1])
      ) {
        return "fontSize";
      }
      return "textColor";
    }

    if (isBackgroundColorUtility(utility)) {
      return "backgroundColor";
    }

    return "";
  }

  function filterTailwindClassesForGutenbergAttrs(classNames, attrs, blockName) {
    var groups = getGutenbergUserConflictGroups(attrs || {}, blockName || "");
    var hasGroups = Object.keys(groups).length > 0;
    if (!hasGroups) {
      return sanitizeClassNames(classNames);
    }

    return classStringToTokenArray(sanitizeClassNames(classNames))
      .filter(function (token) {
        var group;
        if (isImportantTailwindToken(token)) {
          return true;
        }
        group = classifyTailwindConflictGroup(token);
        return !group || !groups[group];
      })
      .join(" ");
  }

  function cloneResponsiveAttrs(attrs) {
    var cloned = {};
    Object.keys(attrs || {}).forEach(function (key) {
      if (Array.isArray(attrs[key])) {
        cloned[key] = attrs[key].slice();
        return;
      }
      if (attrs[key] && typeof attrs[key] === "object") {
        cloned[key] = Object.assign({}, attrs[key]);
        return;
      }
      cloned[key] = attrs[key];
    });
    return cloned;
  }

  function setBreakpointValue(attrs, key, breakpoint, value) {
    var normalizedValue = String(value || "").trim();

    if (normalizedValue) {
      if (
        !attrs[key] ||
        typeof attrs[key] !== "object" ||
        Array.isArray(attrs[key])
      ) {
        attrs[key] = {};
      }
      attrs[key][breakpoint] = normalizedValue;
      return;
    }

    if (attrs[key] && attrs[key][breakpoint]) {
      delete attrs[key][breakpoint];
      if (!Object.keys(attrs[key]).length) {
        delete attrs[key];
      }
    }
  }

  function tailwindAttrToClass(attr, value) {
    if (!value) {
      return null;
    }

    if (attr === "display") {
      return value;
    }
    if (attr === "flexDirection") {
      return "flex-" + value;
    }
    if (attr === "justifyContent") {
      return "justify-" + value;
    }
    if (attr === "alignItems") {
      return "items-" + value;
    }
    if (attr === "flexWrap") {
      return "flex-" + value;
    }
    if (attr === "gridCols") {
      return "grid-cols-" + value;
    }
    if (attr === "fontWeight") {
      return "font-" + value;
    }
    if (attr === "borderRadius") {
      return value === "DEFAULT" ? "rounded" : "rounded-" + value;
    }

    var prefixMap = {
      padding: "p",
      paddingX: "px",
      paddingY: "py",
      paddingTop: "pt",
      paddingRight: "pr",
      paddingBottom: "pb",
      paddingLeft: "pl",
      margin: "m",
      marginX: "mx",
      marginY: "my",
      marginTop: "mt",
      marginRight: "mr",
      marginBottom: "mb",
      marginLeft: "ml",
      gap: "gap",
      gapX: "gap-x",
      gapY: "gap-y",
      fontSize: "text",
      textAlign: "text",
      textColor: "text",
      bgColor: "bg",
      width: "w",
      height: "h",
      maxWidth: "max-w",
    };

    if (prefixMap[attr]) {
      return prefixMap[attr] + "-" + value;
    }

    return null;
  }

  function responsiveAttrsToClassString(attrs) {
    if (
      window.twgbUtils &&
      typeof window.twgbUtils.attrsToClasses === "function"
    ) {
      return sanitizeClassNames(
        window.twgbUtils.attrsToClasses(attrs || {}, tailwindAttrToClass),
      );
    }

    var classes = [];
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "_raw") {
        classes = classes.concat(attrs[key] || []);
        return;
      }
      Object.keys(attrs[key] || {}).forEach(function (breakpoint) {
        var cls = tailwindAttrToClass(key, attrs[key][breakpoint]);
        if (!cls) {
          return;
        }
        var prefix = breakpoint === "base" ? "" : breakpoint + ":";
        classes.push(prefix + cls);
      });
    });

    return sanitizeClassNames(classes.join(" "));
  }

  function parseResponsiveAttrs(classString) {
    if (
      window.twgbUtils &&
      typeof window.twgbUtils.parseClasses === "function"
    ) {
      return cloneResponsiveAttrs(
        window.twgbUtils.parseClasses(classString || ""),
      );
    }
    return {};
  }

  function getResponsiveValue(attrs, key, breakpoint) {
    return (attrs && attrs[key] && attrs[key][breakpoint]) || "";
  }

  function getBreakpointFromPreviewDevice(previewDeviceType) {
    return PREVIEW_DEVICE_TO_BREAKPOINT[previewDeviceType] || "base";
  }

  function getPreviewDeviceTypeFromSelect(selectFn) {
    var stores = ["core/editor", "core/edit-post"];

    for (var i = 0; i < stores.length; i++) {
      var selectors = null;
      try {
        selectors = selectFn(stores[i]);
      } catch (error) {
        continue;
      }

      if (!selectors) {
        continue;
      }

      if (typeof selectors.getDeviceType === "function") {
        var stableType = selectors.getDeviceType();
        if (stableType) {
          return stableType;
        }
      }

      if (typeof selectors.__experimentalGetPreviewDeviceType === "function") {
        var experimentalType = selectors.__experimentalGetPreviewDeviceType();
        if (experimentalType) {
          return experimentalType;
        }
      }
    }

    return "Desktop";
  }

  function setPreviewDeviceType(nextType) {
    var stores = ["core/editor", "core/edit-post"];

    for (var i = 0; i < stores.length; i++) {
      var actions = null;
      try {
        actions = wp.data.dispatch(stores[i]);
      } catch (error) {
        continue;
      }

      if (!actions) {
        continue;
      }

      if (typeof actions.setDeviceType === "function") {
        actions.setDeviceType(nextType);
        return;
      }

      if (typeof actions.__experimentalSetPreviewDeviceType === "function") {
        actions.__experimentalSetPreviewDeviceType(nextType);
        return;
      }
    }
  }

  function hasTailwindSupport(settings, blockName) {
    var name = blockName || (settings && settings.name) || "";
    if (!name || name === "core/block") {
      return false;
    }

    if (name === "twgb/tw-svg") {
      return false;
    }

    return name.indexOf("core/") === 0;
  }

  function withCustomAttributes(settings, name) {
    if (!hasTailwindSupport(settings, name)) {
      return settings;
    }

    var next = Object.assign({}, settings);
    next.attributes = Object.assign({}, settings.attributes || {});

    if (!next.attributes[TAILWIND_ATTRIBUTE]) {
      next.attributes[TAILWIND_ATTRIBUTE] = { type: "object" };
    }

    return next;
  }

  const withTailwindInspector = createHigherOrderComponent(function (
    BlockEdit,
  ) {
    return function (props) {
      if (!hasTailwindSupport(null, props.name) || !InspectorControls) {
        return wp.element.createElement(BlockEdit, props);
      }

      var current =
        props.attributes && props.attributes[TAILWIND_ATTRIBUTE]
          ? props.attributes[TAILWIND_ATTRIBUTE]
          : {};
      var cx = String(current.cx || "");

      var _categoryInputs = useState({});
      var categoryInputs = _categoryInputs[0];
      var setCategoryInputs = _categoryInputs[1];

      var previewDeviceType = useSelect(function (storeSelect) {
        return getPreviewDeviceTypeFromSelect(storeSelect);
      }, []);

      var classTokens = classStringToTokenArray(cx);
      var categorizedTokens = groupTailwindTokens(classTokens);

      function setTailwindAttr(patch) {
        props.setAttributes({
          twgbTailwind: Object.assign({}, current, patch),
        });
      }

      function setClasses(classes) {
        setTailwindAttr({ cx: sanitizeClassNames(classes) });
      }

      function setCategoryTokens(categoryKey, tokens) {
        var nextCategoryTokens = normalizeTokenArray(tokens);
        var existingTokens = classStringToTokenArray(cx);
        var merged = existingTokens
          .filter(function (token) {
            return detectTailwindCategory(token) !== categoryKey;
          })
          .concat(nextCategoryTokens);
        setClasses(dedupeTokenArray(merged).join(" "));
      }

      function setCategoryInputValue(categoryKey, value) {
        setCategoryInputs(
          Object.assign({}, categoryInputs, {
            [categoryKey]: String(value || ""),
          }),
        );
      }

      return wp.element.createElement(
        Fragment,
        null,
        wp.element.createElement(BlockEdit, props),
        props.isSelected &&
          wp.element.createElement(
            InspectorControls,
            null,
            wp.element.createElement(
              PanelBody,
              {
                title: __("Tailwind (TWGB)", "tw-gutenberg-bridge"),
                initialOpen: true,
              },
              wp.element.createElement(
                ButtonGroup,
                { className: "twgb-device-toggle" },
                PREVIEW_DEVICE_OPTIONS.map(function (device) {
                  return wp.element.createElement(
                    Button,
                    {
                      key: device,
                      isPrimary: previewDeviceType === device,
                      isSecondary: previewDeviceType !== device,
                      onClick: function () {
                        setPreviewDeviceType(device);
                      },
                      className: "twgb-device-btn",
                    },
                    PREVIEW_DEVICE_LABELS[device] || device,
                  );
                }),
              ),
              wp.element.createElement(TextareaControl, {
                label: __("Class String", "tw-gutenberg-bridge"),
                value: cx,
                rows: 3,
                onChange: function (value) {
                  setTailwindAttr({ cx: sanitizeClassNamesDraft(value) });
                },
              }),
              wp.element.createElement(
                "div",
                { className: "twgb-tailwind-groups" },
                TAILWIND_CATEGORY_ORDER.filter(function (group) {
                  return (
                    group.key !== "other" ||
                    (categorizedTokens.other &&
                      categorizedTokens.other.length > 0)
                  );
                }).map(function (group) {
                  var groupTokens = categorizedTokens[group.key] || [];
                  var groupTitle =
                    group.label +
                    (groupTokens.length ? " (" + groupTokens.length + ")" : "");
                  return wp.element.createElement(
                    "div",
                    { key: group.key, className: "twgb-tailwind-group" },
                    wp.element.createElement(
                      "div",
                      { className: "twgb-tailwind-group__title" },
                      groupTitle,
                    ),
                    wp.element.createElement(FormTokenField, {
                      label: "",
                      className: "twgb-tailwind-group__field",
                      value: groupTokens,
                      placeholder:
                        TAILWIND_CATEGORY_PLACEHOLDERS[group.key] || "",
                      suggestions: getCategorySuggestions(
                        group.key,
                        categoryInputs[group.key],
                      ),
                      onInputChange: function (value) {
                        setCategoryInputValue(group.key, value);
                      },
                      onChange: function (tokens) {
                        setCategoryTokens(group.key, tokens);
                      },
                      maxSuggestions: 120,
                      __experimentalAutoSelectFirstMatch: true,
                      __experimentalExpandOnFocus: true,
                      __experimentalShowHowTo: false,
                      tokenizeOnSpace: true,
                    }),
                  );
                }),
              ),
            ),
          ),
      );
    };
  }, "twgbWithTailwindInspector");

  const withTailwindEditorClasses = createHigherOrderComponent(function (
    BlockListBlock,
  ) {
    return function (props) {
      var current =
        props.attributes && props.attributes[TAILWIND_ATTRIBUTE]
          ? props.attributes[TAILWIND_ATTRIBUTE]
          : {};
      var cx = filterTailwindClassesForGutenbergAttrs(
        current.cx || "",
        props.attributes || {},
        props.name,
      );

      if (!cx || !hasTailwindSupport(null, props.name)) {
        return wp.element.createElement(BlockListBlock, props);
      }

      return wp.element.createElement(
        BlockListBlock,
        Object.assign({}, props, {
          className: mergeClassNames(props.className, cx),
        }),
      );
    };
  }, "twgbWithTailwindEditorClasses");

  addFilter(
    "blocks.registerBlockType",
    "twgb/with-tailwind-attribute",
    withCustomAttributes,
  );
  addFilter(
    "editor.BlockEdit",
    "twgb/with-tailwind-inspector",
    withTailwindInspector,
  );
  addFilter(
    "editor.BlockListBlock",
    "twgb/with-tailwind-editor-classes",
    withTailwindEditorClasses,
    500,
  );

  function hasTailwindClassesOnAttributes(attributes) {
    if (!attributes || typeof attributes !== "object") {
      return false;
    }

    var hasTwClassString =
      typeof attributes.twClasses === "string" && attributes.twClasses.trim();
    var twAttr = attributes[TAILWIND_ATTRIBUTE];
    var hasTwAttr = !!(
      twAttr &&
      typeof twAttr === "object" &&
      typeof twAttr.cx === "string" &&
      twAttr.cx.trim()
    );

    return !!(hasTwClassString || hasTwAttr);
  }

  function collectTailwindBlockStatus(blocks, statusMap) {
    if (!Array.isArray(blocks)) {
      return;
    }

    blocks.forEach(function (block) {
      if (!block || typeof block !== "object") {
        return;
      }

      if (hasTailwindClassesOnAttributes(block.attributes)) {
        statusMap.set(block.clientId, true);
      }

      if (Array.isArray(block.innerBlocks) && block.innerBlocks.length) {
        collectTailwindBlockStatus(block.innerBlocks, statusMap);
      }
    });
  }

  var TAILWIND_OUTLINE_ICON_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 6.036c-2.667 0-4.333 1.325-5 3.976 1-1.325 2.167-1.822 3.5-1.491.761.189 1.305.738 1.906 1.345C13.387 10.855 14.522 12 17 12c2.667 0 4.333-1.325 5-3.976-1 1.325-2.166 1.822-3.5 1.491-.761-.189-1.305-.738-1.907-1.345-.98-.99-2.114-2.134-4.593-2.134zM7 12c-2.667 0-4.333 1.325-5 3.976 1-1.326 2.167-1.822 3.5-1.491.761.189 1.305.738 1.907 1.345.98.989 2.115 2.134 4.594 2.134 2.667 0 4.333-1.325 5-3.976-1 1.325-2.167 1.822-3.5 1.491-.761-.189-1.305-.738-1.906-1.345C10.613 13.145 9.478 12 7 12z"/></svg>';

  function updateOutlineIndicators() {
    var blockEditor = select("core/block-editor");
    if (!blockEditor || typeof blockEditor.getBlocks !== "function") {
      return;
    }

    var blocks = blockEditor.getBlocks();
    if (!Array.isArray(blocks)) {
      return;
    }

    var blockStatusMap = new Map();
    collectTailwindBlockStatus(blocks, blockStatusMap);

    document.querySelectorAll("[data-block]").forEach(function (blockElement) {
      var blockClientId = blockElement.getAttribute("data-block");
      if (!blockClientId) {
        return;
      }

      var titleButton = blockElement.querySelector(
        ".block-editor-list-view-block-select-button__title",
      );
      if (!titleButton || !titleButton.parentElement) {
        return;
      }

      var parent = titleButton.parentElement;
      var container = parent.querySelector(
        ".twgb-outline-indicators-container",
      );
      var hasTailwind = blockStatusMap.has(blockClientId);

      if (!hasTailwind) {
        if (container) {
          container.remove();
        }
        return;
      }

      if (!container) {
        container = document.createElement("span");
        container.className = "twgb-outline-indicators-container";
        parent.insertBefore(container, titleButton.nextSibling);
      }

      container.innerHTML = "";

      var indicator = document.createElement("span");
      indicator.className =
        "twgb-outline-indicator twgb-outline-indicator--tailwind";
      indicator.title = "Block has Tailwind classes";
      indicator.innerHTML = TAILWIND_OUTLINE_ICON_SVG;
      container.appendChild(indicator);
    });
  }

  var outlineIndicatorsQueued = false;
  function queueOutlineIndicatorsUpdate() {
    if (outlineIndicatorsQueued) {
      return;
    }
    outlineIndicatorsQueued = true;
    window.requestAnimationFrame(function () {
      outlineIndicatorsQueued = false;
      updateOutlineIndicators();
    });
  }

  function getTokenElementLabel(tokenElement) {
    var label =
      tokenElement.querySelector(".components-form-token-field__token-text") ||
      tokenElement.querySelector(".components-form-token-field__token-label") ||
      tokenElement.querySelector("[data-wp-component]");
    var text = label ? label.textContent : tokenElement.textContent;
    return String(text || "")
      .replace(/^Remove\s+/i, "")
      .replace(/\s+Remove$/i, "")
      .trim();
  }

  function updateImportantTokenMarkers() {
    document
      .querySelectorAll(
        ".twgb-tailwind-group__field .components-form-token-field__token, .twgb-svg-tailwind-field .components-form-token-field__token",
      )
      .forEach(function (tokenElement) {
        var token = getTokenElementLabel(tokenElement);
        tokenElement.classList.toggle(
          "twgb-token--important",
          isImportantTailwindToken(token),
        );
      });
  }

  var importantTokenMarkersQueued = false;
  function queueImportantTokenMarkersUpdate() {
    if (importantTokenMarkersQueued) {
      return;
    }
    importantTokenMarkersQueued = true;
    window.requestAnimationFrame(function () {
      importantTokenMarkersQueued = false;
      updateImportantTokenMarkers();
    });
  }

  wp.data.subscribe(queueOutlineIndicatorsUpdate);
  wp.data.subscribe(queueImportantTokenMarkersUpdate);

  function splitClassTokens(value) {
    return sanitizeClassNamesDraft(value || "")
      .split(/\s+/)
      .map(function (token) {
        return token.trim();
      })
      .filter(Boolean);
  }

  function collectClassesForCssExport(blocks, tokenSet) {
    if (!Array.isArray(blocks)) {
      return;
    }

    blocks.forEach(function (block) {
      if (!block || typeof block !== "object") {
        return;
      }

      var attrs = block.attributes || {};
      var twAttr =
        attrs &&
        typeof attrs === "object" &&
        attrs[TAILWIND_ATTRIBUTE] &&
        typeof attrs[TAILWIND_ATTRIBUTE] === "object"
          ? attrs[TAILWIND_ATTRIBUTE]
          : null;

      if (twAttr && typeof twAttr.cx === "string") {
        splitClassTokens(twAttr.cx).forEach(function (token) {
          tokenSet.add(token);
        });
      }

      if (typeof attrs.twClasses === "string") {
        splitClassTokens(attrs.twClasses).forEach(function (token) {
          tokenSet.add(token);
        });
      }

      if (typeof attrs.className === "string") {
        splitClassTokens(attrs.className).forEach(function (token) {
          tokenSet.add(token);
        });
      }

      if (Array.isArray(block.innerBlocks) && block.innerBlocks.length) {
        collectClassesForCssExport(block.innerBlocks, tokenSet);
      }
    });
  }

  function getCurrentPostTailwindTokens() {
    var blockEditor = select("core/block-editor");
    if (!blockEditor || typeof blockEditor.getBlocks !== "function") {
      return [];
    }

    var blocks = blockEditor.getBlocks();
    if (!Array.isArray(blocks) || !blocks.length) {
      return [];
    }

    var tokenSet = new Set();
    collectClassesForCssExport(blocks, tokenSet);
    return Array.from(tokenSet);
  }

  function getCompiledTailwindCssFromDocument() {
    var longest = "";

    document.querySelectorAll("style").forEach(function (styleEl) {
      if (!styleEl || styleEl.id === "twgb-tailwind-editor-theme") {
        return;
      }

      var styleType = (styleEl.getAttribute("type") || "").toLowerCase();
      if (styleType === "text/tailwindcss") {
        return;
      }

      var cssText = String(styleEl.textContent || "");
      if (!cssText) {
        return;
      }

      var looksLikeTailwindOutput =
        cssText.indexOf("tailwindcss v") !== -1 ||
        cssText.indexOf("--tw-") !== -1;

      if (!looksLikeTailwindOutput) {
        return;
      }

      if (cssText.length > longest.length) {
        longest = cssText;
      }
    });

    return longest.trim();
  }

  var lastPostCssPayloadSignature = "";

  function saveCompiledPostCss() {
    var editor = select("core/editor");
    if (!editor || typeof editor.getCurrentPostId !== "function") {
      return;
    }

    var postId = parseInt(editor.getCurrentPostId(), 10);
    if (!postId || postId < 1) {
      return;
    }

    var tokens = getCurrentPostTailwindTokens();

    if (window.tailwind && typeof window.tailwind.refresh === "function") {
      try {
        window.tailwind.refresh();
      } catch (err) {}
    }

    window.setTimeout(function () {
      var css = tokens.length ? getCompiledTailwindCssFromDocument() : "";
      if (tokens.length && !css) {
        // Tailwind runtime might still be compiling; avoid deleting existing CSS on transient misses.
        return;
      }

      if (!tokens.length) {
        css = "";
      }

      var signature =
        String(postId) +
        "|" +
        tokens.join(" ") +
        "|" +
        String(css.length) +
        "|" +
        css.slice(0, 160);

      if (signature === lastPostCssPayloadSignature) {
        return;
      }

      lastPostCssPayloadSignature = signature;

      wp.apiFetch({
        path: "/twgb/v1/save-post-css",
        method: "POST",
        data: {
          postId: postId,
          css: css,
        },
      }).catch(function () {});
    }, 320);
  }

  var postSaveState = {
    wasSaving: false,
    wasAutosaving: false,
  };

  function maybeSaveCompiledPostCssOnSave() {
    var editor = select("core/editor");
    if (!editor || typeof editor.isSavingPost !== "function") {
      return;
    }

    var isSaving = !!editor.isSavingPost();

    if (isSaving && !postSaveState.wasSaving) {
      postSaveState.wasSaving = true;
      postSaveState.wasAutosaving =
        typeof editor.isAutosavingPost === "function"
          ? !!editor.isAutosavingPost()
          : false;
      return;
    }

    if (!isSaving && postSaveState.wasSaving) {
      var wasAutosaving = postSaveState.wasAutosaving;
      postSaveState.wasSaving = false;
      postSaveState.wasAutosaving = false;

      if (wasAutosaving) {
        return;
      }

      if (
        typeof editor.didPostSaveRequestSucceed === "function" &&
        !editor.didPostSaveRequestSucceed()
      ) {
        return;
      }

      saveCompiledPostCss();
    }
  }

  wp.data.subscribe(maybeSaveCompiledPostCssOnSave);

  if (
    dispatch("core/blocks") &&
    typeof dispatch("core/blocks").reapplyBlockTypeFilters === "function"
  ) {
    dispatch("core/blocks").reapplyBlockTypeFilters();
  }

  wp.domReady(function () {
    var existingCategories = select("core/blocks").getCategories();
    var hasCategory = existingCategories.some(function (cat) {
      return cat.slug === "twgb";
    });
    if (!hasCategory) {
      dispatch("core/blocks").setCategories(
        [{ slug: "twgb", title: "Tailwind Blocks", icon: "layout" }].concat(
          existingCategories,
        ),
      );
    }

    queueOutlineIndicatorsUpdate();
    queueImportantTokenMarkersUpdate();
    setTimeout(queueOutlineIndicatorsUpdate, 400);
    setTimeout(queueImportantTokenMarkersUpdate, 400);

    if (document.body && window.MutationObserver) {
      new MutationObserver(queueImportantTokenMarkersUpdate).observe(
        document.body,
        {
          childList: true,
          subtree: true,
          characterData: true,
        },
      );
    }
  });

  if (registerPlugin && PluginMoreMenuItem) {
    registerPlugin("twgb-import", {
      render: function () {
        var _state = useState(false);
        var isOpen = _state[0];
        var setOpen = _state[1];

        var _html = useState("");
        var html = _html[0];
        var setHtml = _html[1];

        var _loading = useState(false);
        var loading = _loading[0];
        var setLoading = _loading[1];

        function handleImport() {
          if (!html.trim()) {
            return;
          }
          setLoading(true);

          wp.apiFetch({
            path: "/twgb/v1/parse",
            method: "POST",
            data: { html: html },
          })
            .then(function (response) {
              setLoading(false);
              if (response && response.blocks) {
                insertParsedBlocks(response.blocks);
                setOpen(false);
                setHtml("");
              }
            })
            .catch(function () {
              setLoading(false);
              var fallbackBlock = createBlock("core/group", {
                twgbTailwind: {
                  cx: "",
                },
              });
              dispatch("core/block-editor").insertBlocks([fallbackBlock]);
              setOpen(false);
            });
        }

        function insertParsedBlocks(blockDescriptors) {
          var wpBlocks = blockDescriptors.map(descriptorToBlock);
          dispatch("core/block-editor").insertBlocks(wpBlocks);
        }

        function descriptorToBlock(desc) {
          var inner = (desc.innerBlocks || []).map(descriptorToBlock);
          return createBlock(desc.blockName, desc.attrs || {}, inner);
        }

        return wp.element.createElement(
          Fragment,
          null,
          wp.element.createElement(
            PluginMoreMenuItem,
            {
              onClick: function () {
                setOpen(true);
              },
              icon: "upload",
            },
            __("Import Tailwind HTML", "tw-gutenberg-bridge"),
          ),
          isOpen &&
            wp.element.createElement(
              Modal,
              {
                title: __("Import Tailwind HTML", "tw-gutenberg-bridge"),
                onRequestClose: function () {
                  setOpen(false);
                },
                className: "twgb-import-modal",
              },
              wp.element.createElement(
                "p",
                null,
                __(
                  "Paste your Tailwind HTML below. It will be parsed into Gutenberg blocks.",
                  "tw-gutenberg-bridge",
                ),
              ),
              wp.element.createElement(TextareaControl, {
                value: html,
                onChange: setHtml,
                className: "twgb-import-textarea",
                rows: 12,
                placeholder:
                  '<div class="flex flex-col md:flex-row gap-4 p-8">\n  <h2 class="text-2xl font-bold">Hello</h2>\n  <p class="text-gray-600">World</p>\n</div>',
              }),
              wp.element.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                    marginTop: "12px",
                  },
                },
                wp.element.createElement(
                  Button,
                  {
                    variant: "secondary",
                    onClick: function () {
                      setOpen(false);
                    },
                  },
                  __("Cancel", "tw-gutenberg-bridge"),
                ),
                wp.element.createElement(
                  Button,
                  {
                    variant: "primary",
                    onClick: handleImport,
                    isBusy: loading,
                    disabled: loading || !html.trim(),
                  },
                  loading
                    ? __("Parsing...", "tw-gutenberg-bridge")
                    : __("Import", "tw-gutenberg-bridge"),
                ),
              ),
            ),
        );
      },
    });
  }
})(window.wp);
