import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('dobruniaui-vue', () => ({
  DbrAvatar: {
    props: ['name'],
    template: '<span class="avatar-stub">{{ name }}</span>',
  },
  DbrButton: {
    props: ['nativeType', 'disabled'],
    template:
      '<button :type="nativeType || \'button\'" :disabled="disabled"><slot /></button>',
  },
  DbrCard: {
    template: '<article><slot /></article>',
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
  DbrToggle: {
    props: ['modelValue', 'label'],
    emits: ['update:modelValue'],
    template:
      '<label>{{ label }}<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /></label>',
  },
}));

vi.mock('@/api/clients-api', () => ({
  deleteClient: vi.fn(),
  listManagedClientSessions: vi.fn(),
  revokeManagedClientSession: vi.fn(),
  updateClient: vi.fn(),
}));

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  deleteClient,
  listManagedClientSessions,
  revokeManagedClientSession,
  updateClient,
} from '@/api/clients-api';
import { ApiError } from '@/api/http';
import ClientApplicationCard from '@/components/ClientApplicationCard.vue';
import type { RegisteredClient } from '@/types';
import { toast } from 'vue-sonner';

const CLIENT: RegisteredClient = {
  id: 'client-1',
  name: 'Original App',
  slug: 'original-app',
  description: 'Original description',
  baseUrl: 'https://app.example',
  logoUrl: null,
  redirectUris: ['https://app.example/callback'],
  isActive: true,
  activeSessionCount: 2,
  activeUserCount: 1,
  createdAt: '2026-06-08T10:00:00.000Z',
};

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().trim() === text);
}

function findInput(wrapper: ReturnType<typeof mount>, label: string) {
  const field = wrapper
    .findAll('label')
    .find((candidate) => candidate.text().trim() === label);
  if (!field) {
    throw new Error(`Input not found: ${label}`);
  }
  return field.find('input');
}

describe('ClientApplicationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteClient).mockResolvedValue(undefined);
    vi.mocked(revokeManagedClientSession).mockResolvedValue(undefined);
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  });

  it('сохраняет все редактируемые поля и сообщает родителю об обновлении', async () => {
    const updated = {
      ...CLIENT,
      name: 'Updated App',
      slug: 'updated-app',
      description: 'Updated description',
      baseUrl: null,
      logoUrl: 'https://app.example/logo.png',
      redirectUris: ['https://app.example/new-callback'],
      isActive: false,
    };
    vi.mocked(updateClient).mockResolvedValue({ client: updated });
    const wrapper = mount(ClientApplicationCard, { props: { client: CLIENT } });

    await findButton(wrapper, 'Редактировать')!.trigger('click');
    await findInput(wrapper, 'Название').setValue(' Updated App ');
    await findInput(wrapper, 'Slug').setValue(' updated-app ');
    await findInput(wrapper, 'Описание').setValue(' Updated description ');
    await findInput(wrapper, 'Адрес приложения').setValue('');
    await findInput(wrapper, 'URL логотипа').setValue(' https://app.example/logo.png ');
    await findInput(wrapper, 'Callback URL 1').setValue(
      ' https://app.example/new-callback '
    );
    await findInput(wrapper, 'Приложение активно').setValue(false);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateClient).toHaveBeenCalledWith(CLIENT.id, {
      name: 'Updated App',
      slug: 'updated-app',
      description: 'Updated description',
      baseUrl: '',
      logoUrl: 'https://app.example/logo.png',
      redirectUris: ['https://app.example/new-callback'],
      isActive: false,
    });
    expect(wrapper.emitted('updated')?.[0]).toEqual([updated]);
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('отображает ошибку обновления и не сообщает об успехе', async () => {
    vi.mocked(updateClient).mockRejectedValue(new ApiError('Update forbidden', 403));
    const wrapper = mount(ClientApplicationCard, { props: { client: CLIENT } });

    await findButton(wrapper, 'Редактировать')!.trigger('click');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Update forbidden');
    expect(wrapper.emitted('updated')).toBeUndefined();
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('показывает пассивный статус текстом, а не кнопкой', () => {
    const wrapper = mount(ClientApplicationCard, { props: { client: CLIENT } });

    expect(wrapper.find('.client-status').element.tagName).toBe('SPAN');
    expect(wrapper.find('.client-status').text()).toContain('Активно');
    expect(wrapper.findAll('button').some((button) => button.text().includes('Активно'))).toBe(
      false
    );
  });

  it('не удаляет приложение без подтверждения', async () => {
    vi.mocked(globalThis.confirm).mockReturnValue(false);
    const wrapper = mount(ClientApplicationCard, { props: { client: CLIENT } });

    await findButton(wrapper, 'Удалить')!.trigger('click');

    expect(deleteClient).not.toHaveBeenCalled();
    expect(wrapper.emitted('deleted')).toBeUndefined();
  });

  it('удаляет приложение и сообщает родителю его id', async () => {
    const wrapper = mount(ClientApplicationCard, { props: { client: CLIENT } });

    await findButton(wrapper, 'Удалить')!.trigger('click');
    await flushPromises();

    expect(deleteClient).toHaveBeenCalledWith(CLIENT.id);
    expect(wrapper.emitted('deleted')?.[0]).toEqual([CLIENT.id]);
  });

  it('не удаляет карточку при ошибке API удаления', async () => {
    vi.mocked(deleteClient).mockRejectedValue(new ApiError('Delete forbidden', 403));
    const wrapper = mount(ClientApplicationCard, { props: { client: CLIENT } });

    await findButton(wrapper, 'Удалить')!.trigger('click');
    await flushPromises();

    expect(wrapper.emitted('deleted')).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith('Delete forbidden');
  });

  it('загружает сессии один раз и локально обновляет счетчики после отзыва', async () => {
    vi.mocked(listManagedClientSessions).mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          userId: 'user-1',
          userEmail: 'one@example.com',
          userDisplayName: 'One User',
          ipAddress: '127.0.0.1',
          userAgent: null,
          lastSeenAt: null,
          createdAt: '2026-06-08T10:00:00.000Z',
        },
        {
          id: 'session-2',
          userId: 'user-1',
          userEmail: 'one@example.com',
          userDisplayName: 'One User',
          ipAddress: '127.0.0.2',
          userAgent: null,
          lastSeenAt: null,
          createdAt: '2026-06-08T11:00:00.000Z',
        },
      ],
    });
    const wrapper = mount(ClientApplicationCard, { props: { client: CLIENT } });

    await findButton(wrapper, 'Активные сессии')!.trigger('click');
    await flushPromises();
    expect(listManagedClientSessions).toHaveBeenCalledOnce();

    await findButton(wrapper, 'Завершить')!.trigger('click');
    await flushPromises();

    expect(revokeManagedClientSession).toHaveBeenCalledWith(CLIENT.id, 'session-1');
    expect(listManagedClientSessions).toHaveBeenCalledOnce();
    expect(wrapper.findAll('.managed-session')).toHaveLength(1);
    expect(wrapper.emitted('updated')?.[0]).toEqual([
      {
        ...CLIENT,
        activeSessionCount: 1,
        activeUserCount: 1,
      },
    ]);
  });

  it('не скрывает сессию и счетчики при ошибке отзыва', async () => {
    vi.mocked(listManagedClientSessions).mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          userId: 'user-1',
          userEmail: 'one@example.com',
          userDisplayName: null,
          ipAddress: null,
          userAgent: null,
          lastSeenAt: null,
          createdAt: '2026-06-08T10:00:00.000Z',
        },
      ],
    });
    vi.mocked(revokeManagedClientSession).mockRejectedValue(
      new ApiError('Session revoke forbidden', 403)
    );
    const wrapper = mount(ClientApplicationCard, { props: { client: CLIENT } });

    await findButton(wrapper, 'Активные сессии')!.trigger('click');
    await flushPromises();
    await findButton(wrapper, 'Завершить')!.trigger('click');
    await flushPromises();

    expect(wrapper.findAll('.managed-session')).toHaveLength(1);
    expect(wrapper.emitted('updated')).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith('Session revoke forbidden');
  });

  it('показывает ошибку загрузки управляемых сессий', async () => {
    vi.mocked(listManagedClientSessions).mockRejectedValue(
      new ApiError('Sessions unavailable', 503)
    );
    const wrapper = mount(ClientApplicationCard, { props: { client: CLIENT } });

    await findButton(wrapper, 'Активные сессии')!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Sessions unavailable');
    expect(wrapper.findAll('.managed-session')).toHaveLength(0);
  });
});
