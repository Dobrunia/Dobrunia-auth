import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

vi.mock('dobruniaui-vue', () => ({
  DbrButton: {
    props: ['nativeType', 'disabled'],
    template:
      '<button :type="nativeType || \'button\'" :disabled="disabled"><slot /></button>',
  },
  DbrCard: {
    template: '<section><slot /></section>',
  },
  DbrInput: {
    props: ['modelValue', 'label', 'type'],
    emits: ['update:modelValue'],
    template:
      '<label>{{ label }}<input :type="type || \'text\'" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
  },
  DbrLoader: {
    template: '<span class="loader-stub"></span>',
  },
}));

vi.mock('@/api/clients-api', () => ({
  listClients: vi.fn(),
  registerClient: vi.fn(),
}));

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { listClients, registerClient } from '@/api/clients-api';
import type { RegisteredClient } from '@/types';
import ClientsPage from '@/view/ClientsPage.vue';

const CLIENT: RegisteredClient = {
  id: 'client-1',
  name: 'Original App',
  slug: 'original-app',
  description: null,
  baseUrl: null,
  logoUrl: null,
  redirectUris: ['https://app.example/callback'],
  isActive: true,
  activeSessionCount: 0,
  activeUserCount: 0,
  createdAt: '2026-06-08T10:00:00.000Z',
};

const ClientApplicationCardStub = defineComponent({
  props: {
    client: {
      type: Object,
      required: true,
    },
  },
  emits: ['updated', 'deleted'],
  methods: {
    emitUpdated() {
      this.$emit('updated', { ...this.client, name: 'Updated App' });
    },
  },
  template: `
    <article class="client-card-stub">
      <span>{{ client.name }}</span>
      <button class="update-client" @click="emitUpdated">Update</button>
      <button class="delete-client" @click="$emit('deleted', client.id)">Delete</button>
    </article>
  `,
});

function mountPage() {
  return mount(ClientsPage, {
    global: {
      stubs: {
        ClientApplicationCard: ClientApplicationCardStub,
        RouterLink: {
          template: '<span><slot :navigate="() => undefined" /></span>',
        },
      },
    },
  });
}

describe('ClientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listClients).mockResolvedValue({ clients: [CLIENT] });
  });

  it('заменяет и удаляет только измененную карточку без повторной загрузки списка', async () => {
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('.update-client').trigger('click');
    expect(wrapper.text()).toContain('Updated App');

    await wrapper.find('.delete-client').trigger('click');
    expect(wrapper.find('.client-card-stub').exists()).toBe(false);
    expect(wrapper.text()).toContain('Приложений пока нет');
    expect(listClients).toHaveBeenCalledOnce();
  });

  it('регистрирует приложение и добавляет его в начало списка без перезагрузки', async () => {
    const created = {
      ...CLIENT,
      id: 'client-2',
      name: 'Created App',
      slug: 'created-app',
    };
    vi.mocked(registerClient).mockResolvedValue({ client: created });
    const wrapper = mountPage();
    await flushPromises();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue(' Created App ');
    await inputs[1].setValue(' created-app ');
    await inputs[5].setValue(' https://app.example/created-callback ');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(registerClient).toHaveBeenCalledWith({
      name: 'Created App',
      slug: 'created-app',
      description: undefined,
      baseUrl: undefined,
      logoUrl: undefined,
      redirectUris: ['https://app.example/created-callback'],
    });
    expect(wrapper.findAll('.client-card-stub').map((card) => card.text())).toEqual([
      expect.stringContaining('Created App'),
      expect.stringContaining('Original App'),
    ]);
    expect(listClients).toHaveBeenCalledOnce();
  });
});
