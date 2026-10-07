import { useState } from "react";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Tooltip from "@mui/material/Tooltip";

import AddIcon from "@mui/icons-material/AddRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";

import { useChongStore } from "./chongStore";
import { ConfirmDialog } from "./ConfirmDialog";
import { FIELD, HOVER, TEXT2 } from "./look";

/** Drag data type for pills, shared with RollPanel */
export const PILL_DRAG = "application/x-chongdie-pill";
const TAB_DRAG = "application/x-chongdie-tab";

/**
 * Tabs like browser tabs: + adds, double-click renames, × deletes,
 * drag to reorder. Dropping a pill on a tab moves it there.
 * The first tab (Rolls, with the dice) can't be deleted or moved.
 */
export function TabStrip() {
  const tabs = useChongStore((state) => state.saved.tabs);
  const activeTabId = useChongStore((state) => state.activeTabId);
  const { setActiveTab, addTab, renameTab, deleteTab, moveTab, movePill } =
    useChongStore.getState();

  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function remove(id: string) {
    const tab = tabs.find((t) => t.id === id);
    if (tab && tab.pills.length > 0) {
      setConfirmDelete(id);
    } else {
      deleteTab(id);
    }
  }

  return (
    <Box
      component="div"
      sx={{ display: "flex", alignItems: "center", gap: 0.5, overflowX: "auto", flex: 1, minWidth: 0 }}
    >
      {tabs.map((tab, index) => {
        const active = tab.id === activeTabId;
        return (
          <Box
            component="div"
            key={tab.id}
            draggable={index > 0 && renaming !== tab.id}
            onDragStart={(e) => e.dataTransfer.setData(TAB_DRAG, tab.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const pill = e.dataTransfer.getData(PILL_DRAG);
              const draggedTab = e.dataTransfer.getData(TAB_DRAG);
              if (pill) {
                movePill(pill, tab.id, tab.pills.length);
              } else if (draggedTab) {
                moveTab(draggedTab, index);
              }
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              borderRadius: "8px",
              bgcolor: active ? HOVER : "transparent",
              color: active ? "text.primary" : TEXT2,
              "&:hover": { bgcolor: active ? HOVER : FIELD, color: "text.primary" },
              pr: active && index > 0 ? 0.25 : 0,
            }}
          >
            {renaming === tab.id ? (
              <InputBase
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  renameTab(tab.id, draft);
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    renameTab(tab.id, draft);
                    setRenaming(null);
                  } else if (e.key === "Escape") {
                    setRenaming(null);
                  }
                }}
                sx={{ px: 1, width: 110, fontSize: 14 }}
              />
            ) : (
              <ButtonBase
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={() => {
                  setDraft(tab.name);
                  setRenaming(tab.id);
                }}
                sx={{ px: 1.5, py: 0.75, fontSize: 14, fontWeight: 500, borderRadius: "8px" }}
              >
                {tab.name}
              </ButtonBase>
            )}
            {active && index > 0 && renaming !== tab.id && (
              <IconButton size="small" aria-label="Delete tab" onClick={() => remove(tab.id)}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>
        );
      })}
      <Tooltip title="New tab" disableInteractive>
        <IconButton size="small" aria-label="New tab" onClick={addTab} sx={{ flexShrink: 0, color: TEXT2 }}>
          <AddIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <ConfirmDialog
        open={confirmDelete !== null}
        title={`Delete "${tabs.find((t) => t.id === confirmDelete)?.name ?? ""}" and its rolls?`}
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && deleteTab(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />
    </Box>
  );
}
