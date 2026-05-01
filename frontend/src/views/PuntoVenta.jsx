import CajaVentas from '../components/CajaVentas';
import { toast } from 'sonner';

export default function PuntoVenta({ productos, onVenta }) {
  return (
    <div className="max-w-7xl mx-auto">
      <CajaVentas productos={productos} onVentaRealizada={onVenta} />
    </div>
  );
}
