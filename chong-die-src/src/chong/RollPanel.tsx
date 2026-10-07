import { useRef, useState } from "react";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import AddIcon from "@mui/icons-material/AddRounded";

import { useChongStore } from "./chongStore";
import { MoreMenu } from "./MoreMenu";
import { PillDialog } from "./PillDialog";
import { placeCommand } from "./place";
import { Pill, pillError, RollTab } from "./savedRolls";
import { PILL_DRAG, TabStrip } from "./TabStrip";
import { useDiceControlsStore } from "../controls/store";
import { DicePills } from "./DicePills";
import { LINE, MUTED, pillSx } from "./look";

const LONG_PRESS_MS = 500;

/** The Rolls panel: tabs and ⋯, then (Rolls tab) the dice, then the tab's saved-roll pills */
export function RollPanel() {
  const tabs = useChongStore((state) => state.saved.tabs);
  const activeTabId = useChongStore((state) => state.activeTabId);
  const tab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const draft = useChongStore((state) => state.draft);
  const addPill = useChongStore((state) => state.addPill);
  const [adding, setAdding] = useState(false);

  return (
    <Box component="div" sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 }}>
      <Box component="div" sx={{ display: "flex", alignItems: "center", gap: 0.5, pl: 1.5, pr: 1, pt: 1.5, pb: 0.5 }}>
        <TabStrip />
        <MoreMenu />
      </Box>
      <Box component="div" sx={{ overflowY: "auto", flex: 1, px: 1.5, pt: 0.5, pb: 1.5 }}>
        {/* The first tab (Rolls) starts with the dice, set apart from your own rolls */}
        {tab.id === tabs[0].id && (
          <>
            <DicePills />
            <Box component="div" sx={{ borderTop: `1px solid ${LINE}`, my: 1.5 }} />
          </>
        )}
        <PillList tab={tab} onAdd={() => setAdding(true)} />
      </Box>
      <PillDialog
        open={adding}
        title="Add roll"
        initialName=""
        initialCommand={draft.trim()}
        onClose={() => setAdding(false)}
        onSave={(name, command, description) => {
          addPill(tab.id, name, command, description);
          setAdding(false);
        }}
      />
    </Box>
  );
}

function PillList({ tab, onAdd }: { tab: RollTab; onAdd: () => void }) {
  const hidden = useDiceControlsStore((state) => state.diceHidden);
  const { setError, movePill, editPill, deletePill } = useChongStore.getState();

  const [menu, setMenu] = useState<{ pill: Pill; anchor: HTMLElement } | null>(null);
  const [editing, setEditing] = useState<Pill | null>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  function run(pill: Pill) {
    const error = pillError(pill);
    if (error) {
      setError(error);
      return;
    }
    try {
      placeCommand(pill.command, { hidden });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Can't roll this");
    }
  }

  function cancelPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  return (
    <Box
      component="div"
      sx={{ display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: 0.75 }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(PILL_DRAG);
        if (id) {
          movePill(id, tab.id, tab.pills.length);
        }
      }}
    >
      {tab.pills.map((pill, index) => {
        const invalid = pillError(pill) !== null;
        return (
          <Tooltip key={pill.id} title={pill.description || ""} disableInteractive>
          <Chip
            label={
              <span>
                {pill.name}
                <Typography
                  component="span"
                  sx={{ ml: 1, fontFamily: "monospace", fontSize: 11, color: MUTED }}
                >
                  {pill.command}
                </Typography>
              </span>
            }
            draggable
            onDragStart={(e) => e.dataTransfer.setData(PILL_DRAG, pill.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData(PILL_DRAG);
              if (id) {
                e.preventDefault();
                e.stopPropagation();
                movePill(id, tab.id, index);
              }
            }}
            onClick={() => {
              if (longPressed.current) {
                longPressed.current = false;
                return;
              }
              run(pill);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ pill, anchor: e.currentTarget });
            }}
            onPointerDown={(e) => {
              if (e.pointerType !== "touch") {
                return;
              }
              const anchor = e.currentTarget;
              longPressed.current = false;
              pressTimer.current = window.setTimeout(() => {
                longPressed.current = true;
                setMenu({ pill, anchor });
              }, LONG_PRESS_MS);
            }}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            sx={{
              ...pillSx,
              maxWidth: "100%",
              boxShadow: invalid ? (theme) => `inset 0 0 0 1.5px ${theme.palette.error.main}` : undefined,
            }}
          />
          </Tooltip>
        );
      })}
      <Tooltip title="Add roll" disableInteractive>
        <Chip aria-label="Add roll" icon={<AddIcon />} onClick={onAdd} sx={{ ...pillSx, bgcolor: "transparent", "& .MuiChip-label": { display: "none" }, "& .MuiChip-icon": { mx: 0.75 } }} />
      </Tooltip>
      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu?.pill.description && (
          <Typography variant="body2" sx={{ px: 2, py: 1, maxWidth: 260, opacity: 0.8 }}>
            {menu.pill.description}
          </Typography>
        )}
        <MenuItem
          onClick={() => {
            setEditing(menu!.pill);
            setMenu(null);
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            deletePill(menu!.pill.id);
            setMenu(null);
          }}
        >
          Delete
        </MenuItem>
      </Menu>
      <PillDialog
        open={editing !== null}
        title="Edit roll"
        initialName={editing?.name ?? ""}
        initialCommand={editing?.command ?? ""}
        initialDescription={editing?.description ?? ""}
        onClose={() => setEditing(null)}
        onSave={(name, command, description) => {
          editPill(editing!.id, name, command, description);
          setEditing(null);
        }}
      />
    </Box>
  );
}
