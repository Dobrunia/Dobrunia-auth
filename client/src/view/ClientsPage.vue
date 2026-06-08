<template>
  <main class="clients-page">
    <header class="clients-header">
      <div>
        <p class="clients-header__eyebrow dbru-font-size-xs dbru-font-color-muted">Интеграции</p>
        <h1 class="clients-header__title dbru-font-color-base">Мои приложения</h1>
        <p class="clients-header__lead dbru-font-size-base dbru-font-color-muted">
          Управляйте OAuth-настройками, callback URL и активными пользовательскими сессиями своих приложений.
        </p>
      </div>

      <nav class="clients-header__nav" aria-label="Разделы аккаунта">
        <RouterLink v-slot="{ navigate }" :to="ROUTES.HOME" custom>
          <DbrButton
            variant="ghost"
            native-type="button"
            class="dbru-focus-visible"
            @click="navigate"
          >
            Сессии
          </DbrButton>
        </RouterLink>
        <RouterLink v-slot="{ navigate }" :to="ROUTES.PROFILE" custom>
          <DbrButton
            variant="ghost"
            native-type="button"
            class="dbru-focus-visible"
            @click="navigate"
          >
            Аккаунт
          </DbrButton>
        </RouterLink>
      </nav>
    </header>

    <div class="clients-layout">
      <section aria-labelledby="registered-clients-title">
        <div class="section-heading">
          <div>
            <h2 id="registered-clients-title" class="dbru-font-size-lg dbru-font-color-base">
              Зарегистрированные приложения
            </h2>
            <p class="dbru-font-size-sm dbru-font-color-muted">
              {{ clients.length }} {{ clientCountLabel }} принадлежит вашему аккаунту.
            </p>
          </div>
        </div>

        <DbrCard v-if="loadError" variant="bordered" class="state-card state-card--error">
          <p class="dbru-font-size-sm">{{ loadError }}</p>
          <DbrButton
            variant="ghost"
            size="sm"
            native-type="button"
            class="dbru-focus-visible"
            @click="loadClients"
          >
            Повторить
          </DbrButton>
        </DbrCard>

        <div v-else-if="loading" class="loading-state">
          <DbrLoader size="md" />
          <span class="dbru-font-size-sm dbru-font-color-muted">Загружаем приложения…</span>
        </div>

        <DbrCard v-else-if="clients.length === 0" variant="bordered" class="state-card">
          <strong class="dbru-font-size-base dbru-font-color-base">Приложений пока нет</strong>
          <p class="dbru-font-size-sm dbru-font-color-muted">
            Заполните форму справа. После регистрации приложение сразу появится в списке.
          </p>
        </DbrCard>

        <div v-else class="client-list">
          <ClientApplicationCard
            v-for="client in clients"
            :key="client.id"
            :client="client"
            @updated="replaceClient"
            @deleted="removeClientFromList"
          />
        </div>
      </section>

      <DbrCard as="section" variant="surface" class="registration-card">
        <div class="registration-card__heading">
          <p class="dbru-font-size-xs dbru-font-color-muted">Новое подключение</p>
          <h2 class="dbru-font-size-lg dbru-font-color-base">Зарегистрировать приложение</h2>
          <p class="dbru-font-size-sm dbru-font-color-muted">
            Для production callback используйте HTTPS. HTTP разрешен только для localhost и loopback-адресов.
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
          <DbrInput
            v-model="logoUrl"
            label="URL логотипа"
            name="client-logo-url"
            type="url"
            size="md"
            autocomplete="url"
          />

          <fieldset class="redirect-fieldset">
            <legend class="dbru-font-size-sm dbru-font-color-base">OAuth callback URL</legend>
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
                class="dbru-focus-visible"
                @click="removeRedirect(index)"
              >
                Удалить
              </DbrButton>
            </div>
            <DbrButton
              variant="ghost"
              size="sm"
              native-type="button"
              class="dbru-focus-visible redirect-fieldset__add"
              :disabled="redirectUris.length >= 10"
              @click="addRedirect"
            >
              Добавить callback
            </DbrButton>
          </fieldset>

          <p v-if="submitError" class="form-error dbru-font-size-sm">{{ submitError }}</p>

          <DbrButton
            variant="primary"
            native-type="submit"
            size="lg"
            class="dbru-focus-visible"
            :disabled="submitting"
          >
            {{ submitting ? 'Регистрируем…' : 'Зарегистрировать' }}
          </DbrButton>
        </form>
      </DbrCard>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { DbrButton, DbrCard, DbrInput, DbrLoader } from 'dobruniaui-vue';
import { listClients, registerClient } from '@/api/clients-api';
import { ApiError } from '@/api/http';
import ClientApplicationCard from '@/components/ClientApplicationCard.vue';
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
const logoUrl = ref('');
const redirectUris = ref(['']);

const clientCountLabel = computed(() => {
  const count = clients.value.length;
  if (count % 10 === 1 && count % 100 !== 11) return 'приложение';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return 'приложения';
  }
  return 'приложений';
});

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

function replaceClient(updated: RegisteredClient) {
  clients.value = clients.value.map((client) => (client.id === updated.id ? updated : client));
}

function removeClientFromList(clientId: string) {
  clients.value = clients.value.filter((client) => client.id !== clientId);
}

function addRedirect() {
  if (redirectUris.value.length < 10) {
    redirectUris.value.push('');
  }
}

function removeRedirect(index: number) {
  redirectUris.value.splice(index, 1);
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
      logoUrl: logoUrl.value.trim() || undefined,
      redirectUris: redirectUris.value.map((uri) => uri.trim()).filter(Boolean),
    });

    clients.value = [response.client, ...clients.value];
    name.value = '';
    slug.value = '';
    description.value = '';
    baseUrl.value = '';
    logoUrl.value = '';
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
  max-width: 96rem;
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
  font-size: calc(var(--dbru-font-size-xl) + var(--dbru-space-2));
  font-weight: var(--dbru-font-weight-semibold);
  line-height: var(--dbru-line-height-tight);
}

.clients-header__lead {
  max-width: 54rem;
  margin-top: var(--dbru-space-3);
  line-height: var(--dbru-line-height-base);
}

.clients-header__nav {
  display: flex;
  gap: var(--dbru-space-2);
}

.clients-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(21rem, 0.65fr);
  gap: var(--dbru-space-5);
  align-items: start;
  margin-top: var(--dbru-space-5);
}

.section-heading {
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

.client-list,
.registration-form,
.redirect-fieldset,
.state-card,
.loading-state {
  display: grid;
  gap: var(--dbru-space-3);
}

.state-card,
.registration-card {
  padding: var(--dbru-space-4);
  border-color: var(--dbru-color-border);
  border-radius: var(--dbru-radius-md);
}

.registration-card {
  position: sticky;
  top: var(--dbru-space-4);
  box-shadow: var(--dbru-shadow-md);
}

.registration-card__heading {
  margin-bottom: var(--dbru-space-4);
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--dbru-space-2);
  align-items: end;
}

.redirect-fieldset__add {
  justify-self: start;
}

.form-error,
.state-card--error {
  color: var(--dbru-color-error);
}

.loading-state {
  grid-template-columns: auto 1fr;
  align-items: center;
  padding: var(--dbru-space-5);
}

@media (max-width: 1080px) {
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

  .clients-header {
    flex-direction: column;
  }

  .clients-header__nav {
    flex-wrap: wrap;
  }

  .redirect-field {
    grid-template-columns: 1fr;
  }
}
</style>
