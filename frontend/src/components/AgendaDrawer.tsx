import { Drawer } from './Drawer';
import { AgendaPanel } from './AgendaPanel';

interface AgendaDrawerProps {
  open: boolean;
  presetMatchId?: string;
  onClose: () => void;
  onChanged: () => void;
}

export function AgendaDrawer({ open, presetMatchId, onClose, onChanged }: AgendaDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Agenda">
      <AgendaPanel presetMatchId={presetMatchId} onChanged={onChanged} idPrefix="agenda-drawer" />
    </Drawer>
  );
}
