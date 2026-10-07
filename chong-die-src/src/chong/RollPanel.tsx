import { useRef, useState } from "react";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import AddIcon from "@mui/icons-material/AddRounded";
import BoltIcon from "@mui/icons-material/BoltRounded";

import { useChongStore } from "./chongStore";
import { MoreMenu } from "./MoreMenu";
import { PillDialog } from "./PillDialog";
import { sendRoll } from "./sendRoll";
import { Pill, pillError, RollTab } from "./savedRolls";
import { PILL_DRAG, TabStrip } from "./TabStrip";
import { TrayToggle } from "./TrayToggle";

const LONG_PRESS_MS = 500;

/** Tabs of saved-roll pills, under the command line of the Rolls window */
export function RollPanel() {
  const tabs = useChongStore((state) => state.saved.tabs);
  const activeTabId = useChongStore((state) => state.activeTabId);
  const tab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const setInstant = useChongStore((state) => state.setInstant);
  const draft = useChongStore((state) => state.draft);
  const addPill = useChongStore((state) => state.addPill);
  const [adding, setAdding] = useState(false);

  return (
    <Box component="div" sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Tabs, then Instant, add roll, tray and ⋯ on the same row */}
      <Box
        component="div"
        sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.5, borderBottom: 1, borderColor: "divider" }}
      >
        <TabStrip />
        <Tooltip title="Instant" disableInteractive>
          <IconButton
            size="small"
            aria-label="Instant"
            aria-pressed={tab.instant}
            color={tab.instant ? "primary" : "default"}
            sx={{ opacity: tab.instant ? 1 : 0.5 }}
            onClick={() => setInstant(tab.id, !tab.instant)}
          >
            <BoltIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add roll" disableInteractive>
          <IconButton size="small" aria-label="Add roll" onClick={() => setAdding(true)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
        <TrayToggle />
        <MoreMenu />
      </Box>
      <PillList tab={tab} />
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

function PillList({ tab }: { tab: RollTab }) {
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
    // Instant rolls now; otherwise the dice are placed on the tray to throw
    sendRoll(pill.command, !tab.instant);
    setError(null);
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
      sx={{ display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: 1, p: 1.5, overflowY: "auto", flex: 1 }}
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
                  sx={{ ml: 1, fontFamily: "monospace", fontSize: 12, opacity: 0.6 }}
                >
                  {pill.command}
                </Typography>
              </span>
            }
            variant="outlined"
            color={invalid ? "error" : "default"}
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
            sx={{ fontSize: 15, height: 36, borderRadius: "18px", maxWidth: "100%" }}
          />
          </Tooltip>
        );
      })}
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
