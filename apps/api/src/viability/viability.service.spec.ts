import { ViabilityService } from './viability.service';

/**
 * Contrato ACTUAL del ViabilityService (worktree): mock autocontenido EN MEMORIA
 * sin Mongoose, con 3 promociones reales (Altair, Bahía, Mar) y
 * `calcularViabilidadPromocion(promotionId)` con 1 único argumento que devuelve
 * el resultado plano {promotionId, nombre, margenBruto, esViable, recomendacion}.
 * Nada de motor viejo, persistencia ni fixtures de La Marina.
 */
describe('ViabilityService', () => {
  let service: ViabilityService;

  beforeEach(() => {
    service = new ViabilityService();
  });

  describe('listarPromociones', () => {
    it('devuelve las 3 promociones de demostración (Altair, Bahía, Mar)', async () => {
      const result = await service.listarPromociones('kavana_viability_executive');

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.promotionId)).toEqual(['promo-1', 'promo-2', 'promo-3']);
      expect(result.map((p) => p.name)).toEqual([
        'Promoción Altair',
        'Promoción Bahía',
        'Promoción Mar',
      ]);
    });

    it('cada promoción expone los campos del resumen del contrato', async () => {
      const [altair, bahia, mar] = await service.listarPromociones('kavana_viability_executive');

      expect(altair).toMatchObject({
        promotionId: 'promo-1',
        name: 'Promoción Altair',
        status: 'En venta',
        location: { city: 'Castellón' },
        unitsTotal: 100,
        unitsSold: 25,
        avgPrice: 150000,
        totalRevenue: 3750000,
        margin: 30,
      });

      expect(bahia).toMatchObject({
        promotionId: 'promo-2',
        name: 'Promoción Bahía',
        status: 'Planificación',
        location: { city: 'Valencia' },
        unitsTotal: 50,
        unitsSold: 0,
        avgPrice: 180000,
        totalRevenue: 0,
        margin: 25,
      });

      expect(mar).toMatchObject({
        promotionId: 'promo-3',
        name: 'Promoción Mar',
        status: 'En venta',
        location: { city: 'Alicante' },
        unitsTotal: 75,
        unitsSold: 30,
        avgPrice: 120000,
        totalRevenue: 3600000,
        margin: 35,
      });
    });

    it('no depende del companyId ni del rol (demo en memoria, datos compartidos)', async () => {
      const conEmpresa = await service.listarPromociones('kavana_viability_executive');
      const conOtroContexto = await service.listarPromociones('otra-empresa', 'admin');

      expect(conOtroContexto).toEqual(conEmpresa);
      expect(conOtroContexto).toHaveLength(3);
    });
  });

  describe('calcularViabilidadPromocion', () => {
    it('calcula la viabilidad de promo-1 (Altair, margen 30) y devuelve el resultado plano', async () => {
      const result = await service.calcularViabilidadPromocion('promo-1');

      expect(result).toEqual({
        promotionId: 'promo-1',
        nombre: 'Promoción Altair',
        margenBruto: 30,
        esViable: true,
        recomendacion: 'Promoción viable',
      });
    });

    it('promo-2 (Bahía) es viable con margen 25 por encima del umbral del 20 %', async () => {
      const result = await service.calcularViabilidadPromocion('promo-2');

      expect(result).toMatchObject({
        promotionId: 'promo-2',
        nombre: 'Promoción Bahía',
        margenBruto: 25,
        esViable: true,
        recomendacion: 'Promoción viable',
      });
    });

    it('promo-3 (Mar) es viable con margen 35', async () => {
      const result = await service.calcularViabilidadPromocion('promo-3');

      expect(result).toMatchObject({
        promotionId: 'promo-3',
        nombre: 'Promoción Mar',
        margenBruto: 35,
        esViable: true,
        recomendacion: 'Promoción viable',
      });
    });

    it('si la promoción no existe devuelve {promotionId, error} sin lanzar excepción', async () => {
      await expect(service.calcularViabilidadPromocion('promo-inexistente')).resolves.toEqual({
        promotionId: 'promo-inexistente',
        error: 'Promoción no encontrada',
      });
    });
  });

  describe('getPromotionById', () => {
    it('devuelve la promoción si existe', async () => {
      const promo = await service.getPromotionById('promo-2');

      expect(promo?.name).toBe('Promoción Bahía');
    });

    it('devuelve null si no existe', async () => {
      await expect(service.getPromotionById('promo-inexistente')).resolves.toBeNull();
    });
  });
});