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

/** Drag data type for pills, shared with RollPanel */
export const PILL_DRAG = "application/x-chongdie-pill";
const TAB_DRAG = "application/x-chongdie-tab";

/**
 * Tabs like browser tabs: + adds, double-click renames, × deletes,
 * drag to reorder. Dropping a pill on a tab moves it there.
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
            draggable={renaming !== tab.id}
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
              borderRadius: "12px",
              bgcolor: active ? "action.selected" : "transparent",
              pr: active ? 0.25 : 0,
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
                sx={{ px: 1.25, py: 0.75, fontSize: 14, fontWeight: active ? 600 : 400, borderRadius: "12px" }}
              >
                {tab.name}
              </ButtonBase>
            )}
            {active && renaming !== tab.id && (
              <IconButton size="small" aria-label="Delete tab" onClick={() => remove(tab.id)}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>
        );
      })}
      <Tooltip title="New tab" disableInteractive>
        <IconButton size="small" onClick={addTab} sx={{ flexShrink: 0 }}>
          <AddIcon />
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
