<template>
  <main class="clients-page">
    <header class="clients-header">
      <div>
        <p class="clients-header__eyebrow dbru-text-xs dbru-text-muted">Интеграции</p>
        <h1 class="clients-header__title dbru-text-main">Мои приложения</h1>
        <p class="clients-header__lead dbru-text-base dbru-text-muted">
          Зарегистрируйте проект, получите постоянный client_id и укажите разрешенные OAuth callback URL.
          Пользовательские access token здесь не нужно копировать вручную.
        </p>
      </div>

      <nav class="clients-header__nav" aria-label="Разделы аккаунта">
        <RouterLink v-slot="{ navigate }" :to="ROUTES.HOME" custom>
          <DbrButton variant="ghost" native-type="button" @click="navigate">
            Сессии
          </DbrButton>
        </RouterLink>
        <RouterLink v-slot="{ navigate }" :to="ROUTES.PROFILE" custom>
          <DbrButton variant="ghost" native-type="button" @click="navigate">
            Аккаунт
          </DbrButton>
        </RouterLink>
      </nav>
    </header>

    <div class="clients-layout">
      <section aria-labelledby="registered-clients-title">
        <div class="section-heading">
          <div>
            <h2 id="registered-clients-title" class="dbru-text-lg dbru-text-main">Зарегистрированные приложения</h2>
            <p class="dbru-text-sm dbru-text-muted">Показаны только приложения, принадлежащие вашему аккаунту.</p>
          </div>
          <DbrChip variant="ghost">{{ clients.length }}</DbrChip>
        </div>

        <DbrCard v-if="loadError" variant="bordered" class="state-card state-card--error">
          <p class="dbru-text-sm">{{ loadError }}</p>
          <DbrButton variant="ghost" size="sm" native-type="button" @click="loadClients">
            Повторить
          </DbrButton>
        </DbrCard>

        <div v-else-if="loading" class="loading-state">
          <DbrLoader size="md" />
          <span class="dbru-text-sm dbru-text-muted">Загружаем приложения…</span>
        </div>

        <DbrCard v-else-if="clients.length === 0" variant="bordered" class="state-card">
          <strong class="dbru-text-base dbru-text-main">Приложений пока нет</strong>
          <p class="dbru-text-sm dbru-text-muted">
            Заполните форму справа. После регистрации client_id сразу появится в этом списке.
          </p>
        </DbrCard>

        <div v-else class="client-list">
          <DbrCard
            v-for="client in clients"
            :key="client.id"
            as="article"
            variant="bordered"
            class="client-card"
          >
            <div class="client-card__head">
              <div class="client-card__identity">
                <div class="client-mark" aria-hidden="true">{{ client.name.slice(0, 1).toUpperCase() }}</div>
                <div>
                  <h3 class="dbru-text-base dbru-text-main">{{ client.name }}</h3>
                  <span class="dbru-text-xs dbru-text-muted">{{ client.slug }}</span>
                </div>
              </div>
              <DbrChip :variant="client.isActive ? 'primary' : 'ghost'">
                {{ client.isActive ? 'Активно' : 'Отключено' }}
              </DbrChip>
            </div>

            <p v-if="client.description" class="client-card__description dbru-text-sm dbru-text-muted">
              {{ client.description }}
            </p>

            <dl class="client-details">
              <div class="client-details__row client-details__row--id">
                <dt class="dbru-text-xs dbru-text-muted">Постоянный client_id</dt>
                <dd class="dbru-text-sm dbru-text-main client-id">{{ client.id }}</dd>
                <DbrButton
                  variant="ghost"
                  size="sm"
                  native-type="button"
                  :aria-label="`Копировать client_id приложения ${client.name}`"
                  @click="copyClientId(client.id)"
                >
                  Копировать
                </DbrButton>
              </div>
              <div v-if="client.baseUrl" class="client-details__row">
                <dt class="dbru-text-xs dbru-text-muted">Адрес приложения</dt>
                <dd class="dbru-text-sm dbru-text-main">{{ client.baseUrl }}</dd>
              </div>
              <div class="client-details__row">
                <dt class="dbru-text-xs dbru-text-muted">Создано</dt>
                <dd class="dbru-text-sm dbru-text-main">{{ formatDate(client.createdAt) }}</dd>
              </div>
            </dl>

            <div class="redirect-list">
              <span class="dbru-text-xs dbru-text-muted">Разрешенные callback URL</span>
              <code
                v-for="redirectUri in client.redirectUris"
                :key="redirectUri"
                class="redirect-uri dbru-text-sm dbru-text-main"
              >
                {{ redirectUri }}
              </code>
            </div>
          </DbrCard>
        </div>
      </section>

      <DbrCard as="section" variant="surface" class="registration-card">
        <div class="registration-card__heading">
          <p class="dbru-text-xs dbru-text-muted">Новое подключение</p>
          <h2 class="dbru-text-lg dbru-text-main">Зарегистрировать приложение</h2>
          <p class="dbru-text-sm dbru-text-muted">
            Slug должен быть уникальным. Для production callback используйте HTTPS; HTTP разрешен только для
            localhost и loopback-адресов.
          </p>
        </div>

        <form class="registration-form" @submit.prevent="onSubmit">
          <DbrInput v-model="name" label="Название" name="client-name" size="md" required />
          <DbrInput
            v-model="slug"
            label="Slug"
            name="client-slug"
            size="md"
            required
            autocomplete="off"
          />
          <DbrInput
            v-model="description"
            label="Описание"
            name="client-description"
            size="md"
            autocomplete="off"
          />
          <DbrInput
            v-model="baseUrl"
            label="Адрес приложения"
            name="client-base-url"
            type="url"
            size="md"
            autocomplete="url"
          />

          <fieldset class="redirect-fieldset">
            <legend class="dbru-text-sm dbru-text-main">OAuth callback URL</legend>
            <div v-for="(_redirectUri, index) in redirectUris" :key="index" class="redirect-field">
              <DbrInput
                v-model="redirectUris[index]"
                :label="`Callback URL ${index + 1}`"
                :name="`redirect-uri-${index}`"
                type="url"
                size="md"
                required
                autocomplete="url"
              />
              <DbrButton
                v-if="redirectUris.length > 1"
                variant="ghost"
                size="sm"
                native-type="button"
                :aria-label="`Удалить callback URL ${index + 1}`"
                @click="removeRedirect(index)"
              >
                Удалить
              </DbrButton>
            </div>
            <DbrButton
              variant="ghost"
              size="sm"
              native-type="button"
              :disabled="redirectUris.length >= 10"
              @click="addRedirect"
            >
              Добавить callback
            </DbrButton>
          </fieldset>

          <p v-if="submitError" class="form-error dbru-text-sm">{{ submitError }}</p>

          <DbrButton variant="primary" native-type="submit" size="lg" :disabled="submitting">
            {{ submitting ? 'Регистрируем…' : 'Зарегистрировать' }}
          </DbrButton>
        </form>
      </DbrCard>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  DbrButton,
  DbrCard,
  DbrChip,
  DbrInput,
  DbrLoader,
} from 'dobruniaui-vue';
import { listClients, registerClient } from '@/api/clients-api';
import { ApiError } from '@/api/http';
import { ROUTES } from '@/constants/app.constants';
import type { RegisteredClient } from '@/types';

const clients = ref<RegisteredClient[]>([]);
const loading = ref(true);
const loadError = ref('');
const submitting = ref(false);
const submitError = ref('');

const name = ref('');
const slug = ref('');
const description = ref('');
const baseUrl = ref('');
const redirectUris = ref(['']);

async function loadClients() {
  loading.value = true;
  loadError.value = '';

  try {
    const response = await listClients();
    clients.value = response.clients;
  } catch (error) {
    loadError.value = error instanceof ApiError ? error.message : 'Не удалось загрузить приложения';
  } finally {
    loading.value = false;
  }
}

function addRedirect() {
  if (redirectUris.value.length < 10) {
    redirectUris.value.push('');
  }
}

function removeRedirect(index: number) {
  redirectUris.value.splice(index, 1);
}

async function copyClientId(clientId: string) {
  try {
    await navigator.clipboard.writeText(clientId);
    toast.success('client_id скопирован');
  } catch {
    toast.error('Не удалось скопировать client_id');
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function onSubmit() {
  submitError.value = '';
  submitting.value = true;

  try {
    const response = await registerClient({
      name: name.value.trim(),
      slug: slug.value.trim(),
      description: description.value.trim() || undefined,
      baseUrl: baseUrl.value.trim() || undefined,
      redirectUris: redirectUris.value.map((uri) => uri.trim()).filter(Boolean),
    });

    clients.value = [response.client, ...clients.value];
    name.value = '';
    slug.value = '';
    description.value = '';
    baseUrl.value = '';
    redirectUris.value = [''];
    toast.success('Приложение зарегистрировано');
  } catch (error) {
    submitError.value = error instanceof ApiError ? error.message : 'Не удалось зарегистрировать приложение';
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void loadClients();
});
</script>

<style scoped>
.clients-page {
  max-width: 92rem;
  margin-inline: auto;
  padding: var(--dbru-space-5);
  color: var(--dbru-color-text);
}

.clients-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dbru-space-5);
  padding-bottom: var(--dbru-space-5);
  border-bottom: var(--dbru-border-size-1) solid var(--dbru-color-border);
}

.clients-header__eyebrow,
.clients-header__title,
.clients-header__lead,
.section-heading h2,
.section-heading p,
.registration-card__heading p,
.registration-card__heading h2,
.client-card h3,
.state-card p {
  margin: 0;
}

.clients-header__eyebrow,
.registration-card__heading > p:first-child {
  margin-bottom: var(--dbru-space-2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.clients-header__title {
  font-size: calc(var(--dbru-font-size-lg) + var(--dbru-space-3));
  font-weight: var(--dbru-font-weight-semibold);
  line-height: var(--dbru-line-height-tight);
}

.clients-header__lead {
  max-width: 52rem;
  margin-top: var(--dbru-space-3);
  line-height: var(--dbru-line-height-base);
}

.clients-header__nav,
.section-heading,
.client-card__head,
.client-card__identity {
  display: flex;
  align-items: center;
}

.clients-header__nav {
  gap: var(--dbru-space-2);
}

.clients-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(20rem, 0.8fr);
  gap: var(--dbru-space-5);
  align-items: start;
  margin-top: var(--dbru-space-5);
}

.section-heading {
  justify-content: space-between;
  gap: var(--dbru-space-3);
  margin-bottom: var(--dbru-space-3);
}

.section-heading h2,
.registration-card__heading h2 {
  font-weight: var(--dbru-font-weight-semibold);
}

.section-heading p,
.registration-card__heading p:last-child {
  margin-top: var(--dbru-space-1);
  line-height: var(--dbru-line-height-base);
}

.client-list {
  display: grid;
  gap: var(--dbru-space-3);
}

.client-card,
.state-card,
.registration-card {
  padding: var(--dbru-space-4);
  border-radius: var(--dbru-radius-md);
  border-color: var(--dbru-color-border);
}

.client-card {
  box-shadow: var(--dbru-shadow-sm);
}

.client-card__head {
  justify-content: space-between;
  gap: var(--dbru-space-3);
}

.client-card__identity {
  min-width: 0;
  gap: var(--dbru-space-3);
}

.client-mark {
  display: grid;
  flex: 0 0 var(--dbru-control-height-lg);
  width: var(--dbru-control-height-lg);
  height: var(--dbru-control-height-lg);
  place-items: center;
  border-radius: var(--dbru-radius-md);
  color: var(--dbru-color-on-primary);
  background: var(--dbru-color-primary);
  font-weight: var(--dbru-font-weight-semibold);
}

.client-card__description {
  margin: var(--dbru-space-3) 0 0;
  line-height: var(--dbru-line-height-base);
}

.client-details {
  display: grid;
  gap: var(--dbru-space-2);
  margin: var(--dbru-space-4) 0;
}

.client-details__row {
  display: grid;
  grid-template-columns: minmax(8rem, 0.35fr) minmax(0, 1fr);
  gap: var(--dbru-space-2) var(--dbru-space-3);
  align-items: center;
}

.client-details__row--id {
  grid-template-columns: minmax(8rem, 0.35fr) minmax(0, 1fr) auto;
}

.client-details dt,
.client-details dd {
  margin: 0;
}

.client-details dd,
.client-id,
.redirect-uri {
  overflow-wrap: anywhere;
}

.client-id,
.redirect-uri {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.redirect-list {
  display: grid;
  gap: var(--dbru-space-2);
  padding-top: var(--dbru-space-3);
  border-top: var(--dbru-border-size-1) solid var(--dbru-color-border);
}

.redirect-uri {
  display: block;
  padding: var(--dbru-space-2) var(--dbru-space-3);
  border-radius: var(--dbru-radius-sm);
  background: var(--dbru-color-bg);
}

.registration-card {
  position: sticky;
  top: var(--dbru-space-4);
  box-shadow: var(--dbru-shadow-md);
}

.registration-card__heading {
  margin-bottom: var(--dbru-space-4);
}

.registration-form,
.redirect-fieldset,
.redirect-field,
.state-card,
.loading-state {
  display: grid;
  gap: var(--dbru-space-3);
}

.redirect-fieldset {
  min-width: 0;
  margin: 0;
  padding: var(--dbru-space-3);
  border: var(--dbru-border-size-1) solid var(--dbru-color-border);
  border-radius: var(--dbru-radius-md);
}

.redirect-fieldset legend {
  padding-inline: var(--dbru-space-2);
  font-weight: var(--dbru-font-weight-semibold);
}

.redirect-field {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.form-error,
.state-card--error {
  color: var(--dbru-color-error);
}

.state-card p {
  line-height: var(--dbru-line-height-base);
}

.loading-state {
  grid-template-columns: auto 1fr;
  align-items: center;
  padding: var(--dbru-space-5);
}

@media (max-width: 900px) {
  .clients-layout {
    grid-template-columns: 1fr;
  }

  .registration-card {
    position: static;
    grid-row: 1;
  }
}

@media (max-width: 640px) {
  .clients-page {
    padding: var(--dbru-space-4);
  }

  .clients-header,
  .client-card__head {
    align-items: stretch;
    flex-direction: column;
  }

  .clients-header__nav {
    flex-wrap: wrap;
  }

  .client-details__row,
  .client-details__row--id,
  .redirect-field {
    grid-template-columns: 1fr;
  }
}
</style>
