import { useRef, useState } from "react";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Slide from "@mui/material/Slide";
import Switch from "@mui/material/Switch";

import BoltIcon from "@mui/icons-material/BoltRounded";

import { useDiceControlsStore } from "../controls/store";
import { useChongStore } from "./chongStore";
import { COMMAND_LINE_HEIGHT } from "./CommandLine";
import { MoreMenu } from "./MoreMenu";
import { PillDialog } from "./PillDialog";
import { placeCommand } from "./place";
import { startCommandRoll } from "./rollRunner";
import { Pill, pillError, RollTab } from "./savedRolls";
import { PILL_DRAG, TabStrip } from "./TabStrip";

const LONG_PRESS_MS = 500;

/** Tabs of saved-roll pills, covering the tray below the command line */
export function RollPanel() {
  const open = useChongStore((state) => state.panelOpen);
  const tabs = useChongStore((state) => state.saved.tabs);
  const activeTabId = useChongStore((state) => state.activeTabId);
  const tab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const setInstant = useChongStore((state) => state.setInstant);

  return (
    <Slide in={open} direction="down" mountOnEnter unmountOnExit>
      <Box
        component="div"
        sx={{
          position: "absolute",
          top: COMMAND_LINE_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Box
          component="div"
          sx={{ display: "flex", alignItems: "center", px: 1, pt: 0.5, gap: 0.5 }}
        >
          <TabStrip />
          <MoreMenu />
        </Box>
        <Box component="div" sx={{ display: "flex", justifyContent: "flex-end", px: 1.5 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={tab.instant}
                onChange={(e) => setInstant(tab.id, e.target.checked)}
              />
            }
            label="Instant"
            labelPlacement="start"
            componentsProps={{ typography: { variant: "body2" } }}
          />
        </Box>
        <PillList tab={tab} />
      </Box>
    </Slide>
  );
}

function PillList({ tab }: { tab: RollTab }) {
  const hidden = useDiceControlsStore((state) => state.diceHidden);
  const { setError, setPanelOpen, movePill, editPill, deletePill } =
    useChongStore.getState();

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
      // Place puts the dice on the tray; a roll of only virtual dice rolls now
      if (tab.instant || !placeCommand(pill.command)) {
        startCommandRoll(pill.command, { hidden });
        setPanelOpen(false);
      }
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
          <Chip
            key={pill.id}
            label={pill.name}
            title={pill.command}
            icon={tab.instant ? <BoltIcon /> : undefined}
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
        );
      })}
      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
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
        onClose={() => setEditing(null)}
        onSave={(name, command) => {
          editPill(editing!.id, name, command);
          setEditing(null);
        }}
      />
    </Box>
  );
}
