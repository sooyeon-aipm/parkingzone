// Runtime selectors from docs/ut/EVENT_CATALOG.json. No DOM text or input values.
export const controls = [
  {
    "component_id": "shared_toggle",
    "selectors": [
      "#shared-toggle"
    ],
    "action_values": [
      "on",
      "off"
    ]
  },
  {
    "component_id": "ticket_toggle",
    "selectors": [
      "#ticket-toggle"
    ],
    "action_values": [
      "on",
      "off"
    ]
  },
  {
    "component_id": "map_zoom",
    "selectors": [
      "#zoom-in",
      "#zoom-out"
    ],
    "action_values": [
      "in",
      "out"
    ]
  },
  {
    "component_id": "map_reset",
    "selectors": [
      "#recenter"
    ]
  },
  {
    "component_id": "search_open",
    "selectors": [
      "#open-search"
    ]
  },
  {
    "component_id": "ai_open",
    "selectors": [
      "#open-ai"
    ]
  },
  {
    "component_id": "filters_open",
    "selectors": [
      "#open-filters"
    ]
  },
  {
    "component_id": "date_open",
    "selectors": [
      "#open-date"
    ]
  },
  {
    "component_id": "service_toggle",
    "selectors": [
      "#monthly-mode",
      "#carwash-mode"
    ],
    "action_values": [
      "parking",
      "monthly",
      "carwash"
    ]
  },
  {
    "component_id": "list_open",
    "selectors": [
      "#open-list"
    ]
  },
  {
    "component_id": "personal_open",
    "selectors": [
      "#open-share",
      "#open-favorites",
      "#open-tickets"
    ],
    "action_values": [
      "share",
      "favorites",
      "tickets"
    ]
  },
  {
    "component_id": "map_marker",
    "selectors": [
      "[data-parking-id]"
    ]
  },
  {
    "component_id": "list_height",
    "selectors": [
      "#close-list"
    ]
  },
  {
    "component_id": "list_map",
    "selectors": [
      "#list-map"
    ]
  },
  {
    "component_id": "list_category",
    "selectors": [
      "[data-category]"
    ],
    "action_values": [
      "recommended",
      "day",
      "hourly",
      "night",
      "overnight"
    ]
  },
  {
    "component_id": "list_sort",
    "selectors": [
      "#sort-distance",
      "#sort-price"
    ],
    "action_values": [
      "distance",
      "price"
    ]
  },
  {
    "component_id": "list_refresh",
    "selectors": [
      "#search-here"
    ]
  },
  {
    "component_id": "list_product",
    "selectors": [
      "[data-lot]"
    ]
  },
  {
    "component_id": "detail_height",
    "selectors": [
      "#expand",
      "#detail-heading"
    ]
  },
  {
    "component_id": "detail_back",
    "selectors": [
      "#back"
    ],
    "action_values": [
      "map",
      "list",
      "favorites"
    ]
  },
  {
    "component_id": "detail_directions",
    "selectors": [
      "#detail-directions"
    ]
  },
  {
    "component_id": "facility_action",
    "selectors": [
      "[data-facility-action]"
    ],
    "action_values": [
      "share",
      "edit",
      "favorite",
      "directions"
    ]
  },
  {
    "component_id": "parking_retry",
    "selectors": [
      "[data-refresh-parking]"
    ]
  },
  {
    "component_id": "pass_request_preview",
    "selectors": [
      "[data-request-pass]"
    ]
  },
  {
    "component_id": "all_products",
    "selectors": [
      "[data-all-products]"
    ]
  },
  {
    "component_id": "product_select_finish",
    "selectors": [
      "[data-buy-product]"
    ]
  },
  {
    "component_id": "product_conditions",
    "selectors": [
      ".facility-product-conditions summary"
    ],
    "action_values": [
      "open",
      "close"
    ]
  },
  {
    "component_id": "facility_conditions",
    "selectors": [
      ".facility-info details summary"
    ],
    "action_values": [
      "open",
      "close"
    ]
  },
  {
    "component_id": "facility_action_close",
    "selectors": [
      "#close-facility-action"
    ]
  },
  {
    "component_id": "facility_copy",
    "selectors": [
      "[data-copy-facility]"
    ]
  },
  {
    "component_id": "facility_copy_field",
    "selectors": [
      "#facility-copy-value"
    ]
  },
  {
    "component_id": "facility_map_focus",
    "selectors": [
      "#facility-show-on-map"
    ]
  },
  {
    "component_id": "facility_edit_field",
    "selectors": [
      "#facility-edit-form textarea[name=message]"
    ]
  },
  {
    "component_id": "facility_edit_submit",
    "selectors": [
      "#facility-edit-form",
      "#facility-edit-form button[type=submit]"
    ]
  },
  {
    "component_id": "screen_close",
    "selectors": [
      "#close-ai",
      "#close-tickets",
      "#close-ticket-history",
      "#close-favorites",
      "#close-search",
      "#close-date",
      "#close-filters",
      "#close-filter-options",
      "#confirm-filter-options"
    ]
  },
  {
    "component_id": "history_open",
    "selectors": [
      "#open-ticket-history"
    ]
  },
  {
    "component_id": "history_tab",
    "selectors": [
      "[data-history-tab]"
    ],
    "action_values": [
      "tickets",
      "mpass"
    ]
  },
  {
    "component_id": "favorite_item",
    "selectors": [
      "[data-favorite-lot]"
    ]
  },
  {
    "component_id": "search_field",
    "selectors": [
      "#search"
    ]
  },
  {
    "component_id": "search_submit",
    "selectors": [
      "#search-form",
      "#search-form button[type=submit]"
    ]
  },
  {
    "component_id": "search_suggestion",
    "selectors": [
      "[data-search]"
    ]
  },
  {
    "component_id": "calendar_month",
    "selectors": [
      "#previous-month",
      "#next-month"
    ],
    "action_values": [
      "previous",
      "next"
    ]
  },
  {
    "component_id": "calendar_day",
    "selectors": [
      "[data-date]"
    ]
  },
  {
    "component_id": "duration_choice",
    "selectors": [
      "[data-duration]"
    ]
  },
  {
    "component_id": "date_apply",
    "selectors": [
      "#confirm-date"
    ]
  },
  {
    "component_id": "filters_reset_draft",
    "selectors": [
      "#reset-filters"
    ]
  },
  {
    "component_id": "filter_choice",
    "selectors": [
      "[data-search-filter]"
    ],
    "action_values": [
      "monthlyOnly",
      "partner",
      "public",
      "card",
      "nonMechanical",
      "free",
      "cafe",
      "restaurant",
      "mart",
      "ev"
    ]
  },
  {
    "component_id": "filter_options_open",
    "selectors": [
      "[data-filter-selector]"
    ],
    "action_values": [
      "charger_type",
      "operator"
    ]
  },
  {
    "component_id": "filters_apply",
    "selectors": [
      "#apply-filters"
    ]
  },
  {
    "component_id": "prototype_restart",
    "selectors": [
      "#restart"
    ]
  },
  {
    "component_id": "share_back",
    "selectors": [
      "[data-share-back]"
    ]
  },
  {
    "component_id": "share_next",
    "selectors": [
      "[data-share-next]"
    ]
  },
  {
    "component_id": "share_choice",
    "selectors": [
      "[data-share-choice]"
    ],
    "action_values": [
      "type_resident",
      "type_private",
      "operation_hourly",
      "operation_monthly",
      "external_yes",
      "external_no",
      "designated_yes",
      "designated_no"
    ]
  },
  {
    "component_id": "share_address_open",
    "selectors": [
      "[data-share-address]"
    ]
  },
  {
    "component_id": "share_form_field",
    "selectors": [
      ".share-form input[name=name]",
      ".share-form input[name=spaces]",
      ".share-form input[name=fee]",
      ".share-form textarea[name=description]"
    ]
  },
  {
    "component_id": "share_photo",
    "selectors": [
      "[data-photo-slot]"
    ],
    "action_values": [
      "overview_selected",
      "proof_selected",
      "overview_cleared",
      "proof_cleared"
    ]
  },
  {
    "component_id": "share_dialog_close",
    "selectors": [
      "[data-share-dismiss]"
    ]
  },
  {
    "component_id": "share_photos_continue",
    "selectors": [
      "[data-share-continue]"
    ]
  },
  {
    "component_id": "share_boundary",
    "selectors": [
      "[data-share-boundary]"
    ]
  },
  {
    "component_id": "share_mock_consent",
    "selectors": [
      "[data-share-consent]"
    ]
  },
  {
    "component_id": "share_form_validation",
    "selectors": [
      ".share-form"
    ]
  },
  {
    "component_id": "address_back",
    "selectors": [
      "[data-address-back]"
    ]
  },
  {
    "component_id": "address_search_field",
    "selectors": [
      "[data-address-search] input"
    ]
  },
  {
    "component_id": "address_search_submit",
    "selectors": [
      "[data-address-search]",
      "[data-address-search] button[type=submit]"
    ]
  },
  {
    "component_id": "address_current_location",
    "selectors": [
      "[data-address-locate]"
    ]
  },
  {
    "component_id": "address_result",
    "selectors": [
      "[data-address-result]"
    ]
  },
  {
    "component_id": "address_detail_field",
    "selectors": [
      "[data-address-detail]"
    ]
  },
  {
    "component_id": "address_confirm",
    "selectors": [
      "[data-address-confirm]"
    ]
  }
];
export const impressions = [
  {
    "component_id": "facility_card",
    "selectors": [
      "[data-parking-row]"
    ]
  },
  {
    "component_id": "congestion_badge",
    "selectors": [
      ".badge"
    ]
  },
  {
    "component_id": "source_updated_time",
    "selectors": [
      ".status-time",
      "#detail-updated"
    ]
  },
  {
    "component_id": "parking_status",
    "selectors": [
      ".status-panel"
    ]
  },
  {
    "component_id": "last_record",
    "selectors": [
      ".facility-record-label"
    ]
  },
  {
    "component_id": "facility_identity",
    "selectors": [
      ".facility-identity",
      ".facility-type",
      "#detail-compact-meta"
    ]
  },
  {
    "component_id": "product_card",
    "selectors": [
      ".facility-product",
      ".ticket"
    ]
  },
  {
    "component_id": "product_conditions_body",
    "selectors": [
      ".facility-product-conditions[open]"
    ]
  },
  {
    "component_id": "onsite_fee",
    "selectors": [
      ".facility-onsite",
      ".facility-info"
    ]
  },
  {
    "component_id": "facility_notice",
    "selectors": [
      ".facility-unavailable",
      ".facility-unsupported",
      ".facility-banner",
      ".facility-info details[open]"
    ]
  },
  {
    "component_id": "empty_state",
    "selectors": [
      ".empty",
      ".ticket-empty",
      ".facility-no-products"
    ]
  },
  {
    "component_id": "error_notice",
    "selectors": [
      "#map-error",
      "#load-message",
      "#date-error",
      "#favorites-error",
      "#facility-action-message",
      "[data-address-status]"
    ]
  },
  {
    "component_id": "toast",
    "selectors": [
      "#toast"
    ]
  },
  {
    "component_id": "share_dialog",
    "selectors": [
      ".share-dialog"
    ]
  },
  {
    "component_id": "share_boundary_notice",
    "selectors": [
      ".share-boundary-note"
    ]
  },
  {
    "component_id": "share_form_help",
    "selectors": [
      ".share-local-note",
      ".share-photo",
      ".share-address-preview"
    ]
  },
  {
    "component_id": "share_review",
    "selectors": [
      ".share-review"
    ]
  },
  {
    "component_id": "address_help",
    "selectors": [
      ".address-search-note",
      ".address-map"
    ]
  },
  {
    "component_id": "ai_preview",
    "selectors": [
      ".ai-intro",
      ".ai-voice-preview"
    ]
  },
  {
    "component_id": "completion_notice",
    "selectors": [
      "#completion-detail",
      ".completion-note"
    ]
  },
  {
    "component_id": "home_information",
    "selectors": [
      ".ad-example"
    ]
  },
  {
    "component_id": "disabled_control",
    "selectors": [
      "button:disabled",
      "input:disabled"
    ]
  }
];
