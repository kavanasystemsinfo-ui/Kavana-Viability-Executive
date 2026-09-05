// El servicio exige API_KEY_ENCRYPTION_KEY (32 bytes en base64) en el constructor.
// Se fija ANTES de instanciar el servicio, con una clave AES-256 válida.
process.env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { UserSettings } from './user-settings.schema';
import { UserSettingsService } from './user-settings.service';

/**
 * UserSettingsService actual: encripta apiKey con AES-256-CBC usando
 * API_KEY_ENCRYPTION_KEY del entorno (formato `${ivBase64}:${cifradoBase64}`).
 * Persiste vía modelo Mongoose mockeado con un `Model` simple (constructor +
 * métodos de query con exec()).
 */
describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let modelMock: any;

  const dto = {
    userId: 'user-1',
    companyId: 'kavana_viability_executive',
    llmProvider: 'openrouter',
    modelName: 'google/gemini-flash-1.5',
    apiKey: 'sk-demo-secreto',
    maxTokensPerDay: 1000,
    maxRequestsPerDay: 100,
  };

  // Documento Mongoose simulado: objeto plano + toObject().
  function buildDoc(overrides: Record<string, unknown> = {}) {
    const plain = {
      _id: 'id-1',
      userId: 'user-1',
      companyId: 'kavana_viability_executive',
      llmProvider: 'openrouter',
      modelName: 'google/gemini-flash-1.5',
      apiKey: 'cifrado:demo',
      maxTokensPerDay: 1000,
      maxRequestsPerDay: 100,
      ...overrides,
    };
    return { ...plain, toObject: () => plain };
  }

  beforeEach(async () => {
    modelMock = jest.fn().mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue(buildDoc({ apiKey: data?.apiKey })),
    }));
    modelMock.find = jest.fn();
    modelMock.findOne = jest.fn();
    modelMock.findById = jest.fn();
    modelMock.findByIdAndUpdate = jest.fn();
    modelMock.findByIdAndDelete = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSettingsService,
        {
          provide: getModelToken(UserSettings.name),
          useValue: modelMock,
        },
      ],
    }).compile();

    service = module.get<UserSettingsService>(UserSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('está definido', () => {
    expect(service).toBeDefined();
  });

  describe('encriptación AES-256-CBC', () => {
    it('encripta y desencripta una apiKey con el mismo resultado (roundtrip)', () => {
      const encriptada = (service as any).encryptApiKey('sk-secreto-1');
      const desencriptada = (service as any).decryptApiKey(encriptada);

      expect(encriptada).not.toBe('sk-secreto-1');
      expect(encriptada).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/); // iv:cifrado en base64
      expect(desencriptada).toBe('sk-secreto-1');
    });

    it('usa un IV aleatorio: dos encriptaciones del mismo valor difieren', () => {
      const primera = (service as any).encryptApiKey('sk-secreto-1');
      const segunda = (service as any).encryptApiKey('sk-secreto-1');

      expect(primera).not.toBe(segunda);
    });
  });

  describe('create', () => {
    it('encripta la apiKey antes de construir el documento y devuelve lo guardado', async () => {
      // Copia: el servicio MUTA el dto que recibe (le encripta apiKey en el sitio).
      const created = await service.create({ ...dto });

      // El dto que recibe el modelo lleva la apiKey encriptada, no el texto plano.
      expect(modelMock).toHaveBeenCalledTimes(1);
      const dtoRecibido = modelMock.mock.calls[0][0];
      expect(dtoRecibido.apiKey).not.toBe(dto.apiKey);
      expect(dtoRecibido.apiKey).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
      expect(dtoRecibido.userId).toBe('user-1');

      // El documento devuelto mantiene la apiKey encriptada (el servicio no
      // desencripta en create: la desencriptación ocurre en las lecturas).
      expect((created as any).apiKey).not.toBe(dto.apiKey);
    });
  });

  describe('findByUserId', () => {
    it('devuelve null si el usuario no tiene settings', async () => {
      modelMock.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.findByUserId('user-inexistente');

      expect(result).toBeNull();
      expect(modelMock.findOne).toHaveBeenCalledWith({ userId: 'user-inexistente' });
    });

    it('devuelve las settings con la apiKey desencriptada', async () => {
      const encriptada = (service as any).encryptApiKey('sk-demo-secreto');
      modelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(buildDoc({ apiKey: encriptada })),
      });

      const result = await service.findByUserId('user-1');

      expect(result).toMatchObject({
        userId: 'user-1',
        llmProvider: 'openrouter',
        modelName: 'google/gemini-flash-1.5',
        apiKey: 'sk-demo-secreto',
      });
    });
  });

  describe('findAll', () => {
    it('devuelve todas las settings con las apiKeys desencriptadas', async () => {
      const encriptadaA = (service as any).encryptApiKey('sk-empresa-a');
      const encriptadaB = (service as any).encryptApiKey('sk-empresa-b');
      modelMock.find.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([
            buildDoc({ _id: 'a', userId: 'user-a', apiKey: encriptadaA }),
            buildDoc({ _id: 'b', userId: 'user-b', apiKey: encriptadaB }),
          ]),
      });

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ userId: 'user-a', apiKey: 'sk-empresa-a' });
      expect(result[1]).toMatchObject({ userId: 'user-b', apiKey: 'sk-empresa-b' });
      expect(modelMock.find).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('devuelve null si el id no existe', async () => {
      modelMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.findOne('id-inexistente');

      expect(result).toBeNull();
      expect(modelMock.findById).toHaveBeenCalledWith('id-inexistente');
    });

    it('devuelve las settings con la apiKey desencriptada', async () => {
      const encriptada = (service as any).encryptApiKey('sk-demo-secreto');
      modelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(buildDoc({ apiKey: encriptada })),
      });

      const result = await service.findOne('id-1');

      expect(result).toMatchObject({ _id: 'id-1', apiKey: 'sk-demo-secreto' });
    });
  });

  describe('update', () => {
    it('encripta la nueva apiKey en el update y devuelve el documento desencriptado', async () => {
      const nuevaEncriptada = (service as any).encryptApiKey('sk-nueva');
      modelMock.findByIdAndUpdate.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue(buildDoc({ llmProvider: 'openai', apiKey: nuevaEncriptada })),
      });

      const resultado = await service.update('id-1', { llmProvider: 'openai', apiKey: 'sk-nueva' });

      expect(modelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        'id-1',
        expect.objectContaining({
          llmProvider: 'openai',
          apiKey: expect.not.stringMatching(/^sk-nueva$/),
        }),
        { new: true },
      );
      const dtoUpdate = modelMock.findByIdAndUpdate.mock.calls[0][1];
      expect(dtoUpdate.apiKey).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
      expect(resultado).toMatchObject({ llmProvider: 'openai', apiKey: 'sk-nueva' });
    });

    it('devuelve null si el id no existe', async () => {
      modelMock.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.update('id-inexistente', { llmProvider: 'openai' });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('borra por id y devuelve el documento eliminado', async () => {
      const doc = buildDoc({ apiKey: 'cifrado:demo' });
      modelMock.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

      const result = await service.remove('id-1');

      expect(modelMock.findByIdAndDelete).toHaveBeenCalledWith('id-1');
      expect((result as any)._id).toBe('id-1');
    });
  });
});