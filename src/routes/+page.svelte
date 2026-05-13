<script lang="ts">
  import { onMount } from 'svelte';
  import EditableText from '../components/EditableText.svelte';
  import { generateThemeVars } from '$lib/color';
  import {
    isAdmin,
    siteContent,
    contentStatus,
    contentError,
    updateContent,
  } from '$lib/stores';

  let { data } = $props();
  siteContent.set(data.content);
  import {
    createEmptyDay,
    createEmptySession,
    createEmptySpeaker,
    createEmptyPricingOption,
    createSection,
    type Section,
    type ProgramSectionData,
    type SpeakersSectionData,
    type PricingSectionData,
    type RegistrationSectionData,
    type TextSectionData,
    type AccordionSectionData,
    type HeroImage,
  } from '$lib/content';

  const IMGBB_API_KEY = 'd74efd2fa75705b574e66c040fabe113';
  const ADMIN_LOGIN = 'admin';
  const ADMIN_PASSWORD = '123456789';
  const STORAGE_KEY = 'gestalt-admin-auth';

  let isLoginModalOpen = $state(false);
  let loginField = $state('admin');
  let passwordField = $state('');
  let loginError = $state('');

  // Session modal state
  let sessionModal = $state<{ si: number; dayIndex: number; sessionIndex: number } | null>(null);
  let sessionModalContent = $derived.by(() => {
    if (!sessionModal) return null;
    const sec = $siteContent.sections[sessionModal.si];
    if (!sec || sec.type !== 'program') return null;
    const session = (sec as ProgramSectionData).days[sessionModal.dayIndex]?.sessions[sessionModal.sessionIndex];
    return session ?? null;
  });

  let themeStyle = $derived(generateThemeVars($siteContent.primaryColor || '#0aa5b5'));

  onMount(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      isAdmin.set(true);
    }
  });

  function handleOpenLogin() {
    loginField = ADMIN_LOGIN;
    passwordField = '';
    loginError = '';
    isLoginModalOpen = true;
  }

  function handleCloseLogin() {
    isLoginModalOpen = false;
    passwordField = '';
    loginError = '';
  }

  function handleLoginSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (loginField === ADMIN_LOGIN && passwordField === ADMIN_PASSWORD) {
      isAdmin.set(true);
      localStorage.setItem(STORAGE_KEY, 'true');
      isLoginModalOpen = false;
      passwordField = '';
      loginError = '';
    } else {
      loginError = 'Неверный логин или пароль';
    }
  }

  function handleLogout() {
    isAdmin.set(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToFirst(type?: string) {
    const s = type
      ? $siteContent.sections.find((s) => s.visible && s.type === type)
      : $siteContent.sections.find((s) => s.visible);
    if (s) scrollToSection(s.id);
  }

  // --- Section helpers ---
  function updateSection(si: number, updater: (s: Section) => Section) {
    updateContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === si ? updater(s) : s)),
    }));
  }

  function toggleVisibility(si: number) {
    updateSection(si, (s) => ({ ...s, visible: !s.visible }));
  }

  function deleteSection(si: number) {
    updateContent((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== si),
    }));
  }

  function moveSection(si: number, dir: -1 | 1) {
    updateContent((prev) => {
      const sections = [...prev.sections];
      const target = si + dir;
      if (target < 0 || target >= sections.length) return prev;
      [sections[si], sections[target]] = [sections[target], sections[si]];
      return { ...prev, sections };
    });
  }

  function addSection(type: Section['type']) {
    updateContent((prev) => ({
      ...prev,
      sections: [...prev.sections, createSection(type)],
    }));
  }

  // --- Photo upload ---
  async function uploadSpeakerPhoto(si: number, speakerIndex: number, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!payload.success || !payload.data?.url) {
        throw new Error(payload.error?.message || 'Не удалось загрузить');
      }
      updateSection(si, (s) => {
        if (s.type !== 'speakers') return s;
        return {
          ...s,
          speakers: s.speakers.map((sp, i) =>
            i === speakerIndex ? { ...sp, photoUrl: payload.data.url } : sp
          ),
        };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось загрузить изображение');
    }
  }

  // --- Hero image upload ---
  async function uploadHeroImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!payload.success || !payload.data?.url) {
        throw new Error(payload.error?.message || 'Не удалось загрузить');
      }
      const newImg: HeroImage = { url: payload.data.url, scale: 1 };
      updateContent((prev) => ({
        ...prev,
        hero: { ...prev.hero, images: [...(prev.hero.images || []), newImg] },
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось загрузить изображение');
    }
  }

  function removeHeroImage(imgIndex: number) {
    updateContent((prev) => ({
      ...prev,
      hero: { ...prev.hero, images: (prev.hero.images || []).filter((_, i) => i !== imgIndex) },
    }));
  }

  function moveHeroImage(imgIndex: number, dir: -1 | 1) {
    updateContent((prev) => {
      const images = [...(prev.hero.images || [])];
      const target = imgIndex + dir;
      if (target < 0 || target >= images.length) return prev;
      [images[imgIndex], images[target]] = [images[target], images[imgIndex]];
      return { ...prev, hero: { ...prev.hero, images } };
    });
  }

  function scaleHeroImage(imgIndex: number, delta: number) {
    updateContent((prev) => {
      const images = (prev.hero.images || []).map((img, i) => {
        if (i !== imgIndex) return img;
        const newScale = Math.max(0.3, Math.min(3, img.scale + delta));
        return { ...img, scale: newScale };
      });
      return { ...prev, hero: { ...prev.hero, images } };
    });
  }

  function btnGradient(color: string | undefined): string {
    if (!color) return '';
    return `background: ${color}; box-shadow: 0 16px 40px ${color}55;`;
  }
</script>

<div class="page" style={themeStyle}>
  <!-- ==================== HEADER ==================== -->
  <header class="header">
    <div class="header-container">
      <nav class="nav">
        {#each $siteContent.sections as section, si}
          {#if section.visible}
            {#if $isAdmin}
              <EditableText
                tag="span"
                value={section.navLabel}
                canEdit={true}
                onchange={(v) => updateSection(si, (s) => ({ ...s, navLabel: v }))}
              />
            {:else}
              <button type="button" onclick={() => scrollToSection(section.id)}>
                {section.navLabel}
              </button>
            {/if}
          {/if}
        {/each}
      </nav>
    </div>
  </header>

  <div class="container">
    <!-- ==================== HERO ==================== -->
    <section class="hero">
      <div class="hero-inner">
        {#if ($siteContent.hero.images && $siteContent.hero.images.length > 0) || $isAdmin}
          <div class="hero-images">
            {#each $siteContent.hero.images || [] as img, imgI}
              <div class="hero-image-item">
                <img src={img.url} alt="" class="hero-image-img" style="height: {img.scale * 80}px;" />
                {#if $isAdmin}
                  <div class="hero-image-controls">
                    <button class="hero-image-ctrl" disabled={imgI === 0} onclick={() => moveHeroImage(imgI, -1)}>&#9664;</button>
                    <button class="hero-image-ctrl" onclick={() => scaleHeroImage(imgI, -0.15)}>-</button>
                    <button class="hero-image-ctrl" onclick={() => scaleHeroImage(imgI, 0.15)}>+</button>
                    <button class="hero-image-ctrl" disabled={imgI === ($siteContent.hero.images || []).length - 1} onclick={() => moveHeroImage(imgI, 1)}>&#9654;</button>
                    <button class="hero-image-ctrl hero-image-remove" onclick={() => removeHeroImage(imgI)}>x</button>
                  </div>
                {/if}
              </div>
            {/each}
            {#if $isAdmin && ($siteContent.hero.images || []).length < 5}
              <label class="section-image-upload">
                + Лого
                <input type="file" accept="image/*" onchange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) uploadHeroImage(file);
                  (e.target as HTMLInputElement).value = '';
                }} />
              </label>
            {/if}
          </div>
        {/if}
        <div>
          <EditableText
            tag="p"
            value={$siteContent.hero.label}
            canEdit={$isAdmin}
            className="hero-label"
            onchange={(v) =>
              updateContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, label: v },
              }))}
          />
          <EditableText
            tag="h1"
            value={$siteContent.hero.heading}
            canEdit={$isAdmin}
            className="hero-heading"
            onchange={(v) =>
              updateContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, heading: v },
              }))}
          />
          <EditableText
            tag="p"
            value={$siteContent.hero.subheading}
            canEdit={$isAdmin}
            className="hero-subheading"
            onchange={(v) =>
              updateContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, subheading: v },
              }))}
          />
        </div>
        <div class="hero-actions">
          {#if $isAdmin}
            <div>
              <EditableText
                tag="span"
                value={$siteContent.hero.primaryButtonText}
                canEdit={true}
                className="hero-btn-primary"
                style={btnGradient($siteContent.hero.primaryButtonColor)}
                onchange={(v) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, primaryButtonText: v },
                  }))}
              />
              <div class="btn-color-picker">
                <input type="color" value={$siteContent.hero.primaryButtonColor || $siteContent.primaryColor}
                  oninput={(e) => updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, primaryButtonColor: (e.target as HTMLInputElement).value },
                  }))} />
                {#if $siteContent.hero.primaryButtonColor}
                  <button class="btn-color-reset" onclick={() => updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, primaryButtonColor: undefined },
                  }))}>сброс</button>
                {/if}
              </div>
            </div>
            <div>
              <EditableText
                tag="span"
                value={$siteContent.hero.secondaryButtonText}
                canEdit={true}
                className="hero-btn-secondary"
                style={$siteContent.hero.secondaryButtonColor ? `color: ${$siteContent.hero.secondaryButtonColor}; border-color: ${$siteContent.hero.secondaryButtonColor}44;` : ''}
                onchange={(v) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, secondaryButtonText: v },
                  }))}
              />
              <div class="btn-color-picker">
                <input type="color" value={$siteContent.hero.secondaryButtonColor || $siteContent.primaryColor}
                  oninput={(e) => updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, secondaryButtonColor: (e.target as HTMLInputElement).value },
                  }))} />
                {#if $siteContent.hero.secondaryButtonColor}
                  <button class="btn-color-reset" onclick={() => updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, secondaryButtonColor: undefined },
                  }))}>сброс</button>
                {/if}
              </div>
            </div>
          {:else}
            <button
              type="button"
              class="hero-btn-primary"
              style={btnGradient($siteContent.hero.primaryButtonColor)}
              onclick={() => scrollToFirst('registration')}
            >
              {$siteContent.hero.primaryButtonText}
            </button>
            <button
              type="button"
              class="hero-btn-secondary"
              style={$siteContent.hero.secondaryButtonColor ? `color: ${$siteContent.hero.secondaryButtonColor}; border-color: ${$siteContent.hero.secondaryButtonColor}44;` : ''}
              onclick={() => scrollToFirst()}
            >
              {$siteContent.hero.secondaryButtonText}
            </button>
          {/if}
        </div>
        <div class="hero-details">
          {#each $siteContent.hero.details as detail, di}
            <div class="hero-detail">
              <EditableText
                tag="span"
                value={detail.label}
                canEdit={$isAdmin}
                className="hero-detail-label"
                onchange={(v) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: {
                      ...prev.hero,
                      details: prev.hero.details.map((d, i) =>
                        i === di ? { ...d, label: v } : d
                      ),
                    },
                  }))}
              />
              {#if detail.isList}
                <ul class="hero-detail-list">
                  {#each detail.value.split('\n').filter(Boolean) as line, lineI}
                    <li>
                      {#if $isAdmin}
                        <EditableText tag="span" value={line} canEdit={true}
                          onchange={(v) => {
                            const lines = detail.value.split('\n').filter(Boolean);
                            lines[lineI] = v;
                            updateContent((prev) => ({
                              ...prev,
                              hero: { ...prev.hero, details: prev.hero.details.map((d, i) => i === di ? { ...d, value: lines.join('\n') } : d) },
                            }));
                          }} />
                        <button class="control-btn" style="font-size:11px;padding:2px 6px;margin-left:4px;"
                          onclick={() => {
                            const lines = detail.value.split('\n').filter(Boolean).filter((_, i) => i !== lineI);
                            updateContent((prev) => ({
                              ...prev,
                              hero: { ...prev.hero, details: prev.hero.details.map((d, i) => i === di ? { ...d, value: lines.length ? lines.join('\n') : 'Пункт' } : d) },
                            }));
                          }}>-</button>
                      {:else}
                        {line}
                      {/if}
                    </li>
                  {/each}
                </ul>
                {#if $isAdmin}
                  <button class="control-btn add-btn" style="font-size:12px;padding:4px 10px;"
                    onclick={() => {
                      const lines = detail.value.split('\n').filter(Boolean);
                      lines.push('Новый пункт');
                      updateContent((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, details: prev.hero.details.map((d, i) => i === di ? { ...d, value: lines.join('\n') } : d) },
                      }));
                    }}>+ пункт</button>
                {/if}
              {:else}
                <EditableText
                  tag="span"
                  value={detail.value}
                  canEdit={$isAdmin}
                  className="hero-detail-value"
                  onchange={(v) =>
                    updateContent((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        details: prev.hero.details.map((d, i) =>
                          i === di ? { ...d, value: v } : d
                        ),
                      },
                    }))}
                />
              {/if}
              {#if $isAdmin}
                <div class="hero-detail-admin">
                  <label class="hero-detail-list-toggle">
                    <input type="checkbox" checked={detail.isList || false}
                      onchange={(e) => {
                        const checked = (e.target as HTMLInputElement).checked;
                        updateContent((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            details: prev.hero.details.map((d, i) =>
                              i === di ? { ...d, isList: checked } : d
                            ),
                          },
                        }));
                      }} />
                    список
                  </label>
                  <button
                    class="control-btn"
                    style="font-size:12px;padding:4px 8px;"
                    onclick={() =>
                      updateContent((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          details: prev.hero.details.filter((_, i) => i !== di),
                        },
                      }))}
                  >-</button>
                </div>
              {/if}
            </div>
          {/each}
          {#if $isAdmin}
            <button
              class="control-btn add-btn"
              onclick={() =>
                updateContent((prev) => ({
                  ...prev,
                  hero: {
                    ...prev.hero,
                    details: [...prev.hero.details, { label: 'Поле', value: 'Значение' }],
                  },
                }))}
            >+ Поле</button>
          {/if}
        </div>
      </div>
      <div class="hero-arrow">
        <button
          type="button"
          class="hero-arrow-btn"
          onclick={() => scrollToFirst()}
          aria-label="Прокрутить к программе"
        >
          <span class="hero-arrow-icon"></span>
        </button>
      </div>
    </section>

    <!-- ==================== DYNAMIC SECTIONS ==================== -->
    {#each $siteContent.sections as section, si (section.id)}
      {#if section.visible || $isAdmin}
        <!-- ===== PROGRAM ===== -->
        {#if section.type === 'program'}
          {@const sec = section as ProgramSectionData}
          <section id={sec.id} class="section {sec.visible ? '' : 'section-hidden'}">
            {#if $isAdmin}
              <div class="section-admin-bar">
                <button class="control-btn" disabled={si === 0} onclick={() => moveSection(si, -1)}>&#9650;</button>
                <button class="control-btn" disabled={si === $siteContent.sections.length - 1} onclick={() => moveSection(si, 1)}>&#9660;</button>
                <button class="control-btn" onclick={() => toggleVisibility(si)}>
                  {sec.visible ? 'Скрыть раздел' : 'Показать раздел'}
                </button>
                <button class="control-btn" onclick={() => deleteSection(si)}>Удалить раздел</button>
              </div>
            {/if}
            <EditableText
              tag="h2"
              value={sec.heading}
              canEdit={$isAdmin}
              className="section-heading"
              onchange={(v) => updateSection(si, (s) => ({ ...s, heading: v }))}
            />
            <div class="program-grid">
              {#each sec.days as day, dayIndex}
                <div class="program-column">
                  <EditableText
                    tag="div"
                    value={day.date}
                    canEdit={$isAdmin}
                    className="program-column-header"
                    onchange={(v) =>
                      updateSection(si, (s) => {
                        if (s.type !== 'program') return s;
                        return { ...s, days: s.days.map((d, i) => (i === dayIndex ? { ...d, date: v } : d)) };
                      })}
                  />
                  <div class="program-column-body">
                    {#each day.sessions as session, sessionIndex}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div
                        class="session-card {session.modalEnabled ? 'session-card-clickable' : ''}"
                        onclick={() => {
                          if (!$isAdmin && session.modalEnabled) {
                            sessionModal = { si, dayIndex, sessionIndex };
                          }
                        }}
                      >
                        <div class="session-meta">
                          <EditableText tag="span" value={session.time} canEdit={$isAdmin} className="session-time"
                            onchange={(v) => updateSection(si, (s) => {
                              if (s.type !== 'program') return s;
                              return { ...s, days: s.days.map((d, di) => di === dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === sessionIndex ? { ...ss, time: v } : ss) } : d) };
                            })} />
                          <EditableText tag="span" value={session.type} canEdit={$isAdmin} className="session-type"
                            onchange={(v) => updateSection(si, (s) => {
                              if (s.type !== 'program') return s;
                              return { ...s, days: s.days.map((d, di) => di === dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === sessionIndex ? { ...ss, type: v } : ss) } : d) };
                            })} />
                        </div>
                        <EditableText tag="div" value={session.title} canEdit={$isAdmin} className="session-title"
                          onchange={(v) => updateSection(si, (s) => {
                            if (s.type !== 'program') return s;
                            return { ...s, days: s.days.map((d, di) => di === dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === sessionIndex ? { ...ss, title: v } : ss) } : d) };
                          })} />
                        <EditableText tag="div" value={session.description} canEdit={$isAdmin} className="session-description"
                          onchange={(v) => updateSection(si, (s) => {
                            if (s.type !== 'program') return s;
                            return { ...s, days: s.days.map((d, di) => di === dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === sessionIndex ? { ...ss, description: v } : ss) } : d) };
                          })} />
                        {#if $isAdmin}
                          <div class="session-admin-controls">
                            <label class="hero-detail-list-toggle">
                              <input type="checkbox" checked={session.modalEnabled || false}
                                onchange={(e) => {
                                  const checked = (e.target as HTMLInputElement).checked;
                                  updateSection(si, (s) => {
                                    if (s.type !== 'program') return s;
                                    return { ...s, days: s.days.map((d, di) => di === dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === sessionIndex ? { ...ss, modalEnabled: checked, modalTitle: ss.modalTitle || ss.title, modalBody: ss.modalBody || ss.description } : ss) } : d) };
                                  });
                                }} />
                              модалка
                            </label>
                            {#if session.modalEnabled}
                              <button class="control-btn" style="font-size:12px;padding:4px 10px;"
                                onclick={() => { sessionModal = { si, dayIndex, sessionIndex }; }}>Открыть</button>
                            {/if}
                            <button class="control-btn" onclick={() =>
                              updateSection(si, (s) => {
                                if (s.type !== 'program') return s;
                                return { ...s, days: s.days.map((d, di) => {
                                  if (di !== dayIndex) return d;
                                  const sessions = d.sessions.filter((_, i) => i !== sessionIndex);
                                  return { ...d, sessions: sessions.length ? sessions : [createEmptySession()] };
                                }) };
                              })}>-</button>
                          </div>
                        {/if}
                      </div>
                    {/each}
                    {#if $isAdmin}
                      <button class="control-btn add-btn" onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'program') return s;
                          return { ...s, days: s.days.map((d, di) => di === dayIndex ? { ...d, sessions: [...d.sessions, createEmptySession()] } : d) };
                        })}>+ Сессия</button>
                    {/if}
                  </div>
                  {#if $isAdmin}
                    <div class="column-controls">
                      <button class="control-btn add-btn" onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'program') return s;
                          const days = [...s.days];
                          days.splice(dayIndex + 1, 0, createEmptyDay());
                          return { ...s, days };
                        })}>+ День</button>
                      <button class="control-btn" onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'program') return s;
                          return { ...s, days: s.days.length === 1 ? [createEmptyDay()] : s.days.filter((_, i) => i !== dayIndex) };
                        })}>- День</button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </section>

        <!-- ===== SPEAKERS ===== -->
        {:else if section.type === 'speakers'}
          {@const sec = section as SpeakersSectionData}
          <section id={sec.id} class="section {sec.visible ? '' : 'section-hidden'}">
            {#if $isAdmin}
              <div class="section-admin-bar">
                <button class="control-btn" disabled={si === 0} onclick={() => moveSection(si, -1)}>&#9650;</button>
                <button class="control-btn" disabled={si === $siteContent.sections.length - 1} onclick={() => moveSection(si, 1)}>&#9660;</button>
                <button class="control-btn" onclick={() => toggleVisibility(si)}>
                  {sec.visible ? 'Скрыть раздел' : 'Показать раздел'}
                </button>
                <button class="control-btn" onclick={() => deleteSection(si)}>Удалить раздел</button>
              </div>
            {/if}
            <EditableText tag="h2" value={sec.heading} canEdit={$isAdmin} className="section-heading"
              onchange={(v) => updateSection(si, (s) => ({ ...s, heading: v }))} />
            <div class="speakers-grid">
              {#each sec.speakers as speaker, spI}
                <div class="speaker-card">
                  {#if $isAdmin}
                    <div class="speaker-card-controls">
                      <button class="control-btn" disabled={spI === 0} onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'speakers') return s;
                          const speakers = [...s.speakers];
                          [speakers[spI - 1], speakers[spI]] = [speakers[spI], speakers[spI - 1]];
                          return { ...s, speakers };
                        })}>&#9650;</button>
                      <button class="control-btn" disabled={spI === sec.speakers.length - 1} onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'speakers') return s;
                          const speakers = [...s.speakers];
                          [speakers[spI], speakers[spI + 1]] = [speakers[spI + 1], speakers[spI]];
                          return { ...s, speakers };
                        })}>&#9660;</button>
                      <button class="control-btn" onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'speakers') return s;
                          return { ...s, speakers: s.speakers.length === 1 ? [createEmptySpeaker()] : s.speakers.filter((_, i) => i !== spI) };
                        })}>Удалить</button>
                    </div>
                  {/if}
                  <div class="speaker-photo-wrapper">
                    {#if speaker.photoUrl}
                      <img src={speaker.photoUrl} alt={speaker.name} class="speaker-photo-image" />
                    {:else}
                      <div class="speaker-photo-placeholder">Фото</div>
                    {/if}
                    {#if $isAdmin}
                      <label class="speaker-photo-upload">
                        Заменить фото
                        <input type="file" accept="image/*" onchange={(e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) uploadSpeakerPhoto(si, spI, file);
                          (e.target as HTMLInputElement).value = '';
                        }} />
                      </label>
                    {/if}
                  </div>
                  <div>
                    <EditableText tag="div" value={speaker.name} canEdit={$isAdmin} className="speaker-name"
                      onchange={(v) => updateSection(si, (s) => {
                        if (s.type !== 'speakers') return s;
                        return { ...s, speakers: s.speakers.map((sp, i) => i === spI ? { ...sp, name: v } : sp) };
                      })} />
                    <EditableText tag="div" value={speaker.role} canEdit={$isAdmin} className="speaker-role"
                      onchange={(v) => updateSection(si, (s) => {
                        if (s.type !== 'speakers') return s;
                        return { ...s, speakers: s.speakers.map((sp, i) => i === spI ? { ...sp, role: v } : sp) };
                      })} />
                    <EditableText tag="div" value={speaker.experience} canEdit={$isAdmin} className="speaker-experience"
                      onchange={(v) => updateSection(si, (s) => {
                        if (s.type !== 'speakers') return s;
                        return { ...s, speakers: s.speakers.map((sp, i) => i === spI ? { ...sp, experience: v } : sp) };
                      })} />
                  </div>
                  <EditableText tag="div" value={speaker.description} canEdit={$isAdmin} className="speaker-description"
                    onchange={(v) => updateSection(si, (s) => {
                      if (s.type !== 'speakers') return s;
                      return { ...s, speakers: s.speakers.map((sp, i) => i === spI ? { ...sp, description: v } : sp) };
                    })} />
                  <div class="speaker-tags">
                    {#each speaker.tags as tag, tagI}
                      <div class="tag-row">
                        <EditableText tag="span" value={tag} canEdit={$isAdmin} className="speaker-tag"
                          onchange={(v) => updateSection(si, (s) => {
                            if (s.type !== 'speakers') return s;
                            return { ...s, speakers: s.speakers.map((sp, i) => {
                              if (i !== spI) return sp;
                              return { ...sp, tags: sp.tags.map((t, ti) => ti === tagI ? v : t) };
                            }) };
                          })} />
                        {#if $isAdmin}
                          <button class="control-btn" onclick={() =>
                            updateSection(si, (s) => {
                              if (s.type !== 'speakers') return s;
                              return { ...s, speakers: s.speakers.map((sp, i) => {
                                if (i !== spI) return sp;
                                const tags = sp.tags.filter((_, ti) => ti !== tagI);
                                return { ...sp, tags: tags.length ? tags : ['Новый тег'] };
                              }) };
                            })}>-</button>
                        {/if}
                      </div>
                    {/each}
                    {#if $isAdmin}
                      <button class="control-btn add-btn" onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'speakers') return s;
                          return { ...s, speakers: s.speakers.map((sp, i) => i === spI ? { ...sp, tags: [...sp.tags, 'Новый тег'] } : sp) };
                        })}>+ тег</button>
                    {/if}
                  </div>
                </div>
              {/each}
              {#if $isAdmin}
                <button class="control-btn add-card-btn" onclick={() =>
                  updateSection(si, (s) => {
                    if (s.type !== 'speakers') return s;
                    return { ...s, speakers: [...s.speakers, createEmptySpeaker()] };
                  })}>+ Спикер</button>
              {/if}
            </div>
          </section>

        <!-- ===== PRICING ===== -->
        {:else if section.type === 'pricing'}
          {@const sec = section as PricingSectionData}
          <section id={sec.id} class="section {sec.visible ? '' : 'section-hidden'}">
            {#if $isAdmin}
              <div class="section-admin-bar">
                <button class="control-btn" disabled={si === 0} onclick={() => moveSection(si, -1)}>&#9650;</button>
                <button class="control-btn" disabled={si === $siteContent.sections.length - 1} onclick={() => moveSection(si, 1)}>&#9660;</button>
                <button class="control-btn" onclick={() => toggleVisibility(si)}>
                  {sec.visible ? 'Скрыть раздел' : 'Показать раздел'}
                </button>
                <button class="control-btn" onclick={() => deleteSection(si)}>Удалить раздел</button>
              </div>
            {/if}
            <EditableText tag="h2" value={sec.heading} canEdit={$isAdmin} className="section-heading"
              onchange={(v) => updateSection(si, (s) => ({ ...s, heading: v }))} />
            <div class="pricing-grid">
              {#each sec.options as option, optI}
                <div class="price-card {option.highlight ? 'highlight' : ''}">
                  {#if option.label || $isAdmin}
                    <EditableText tag="span" value={option.label ?? ''} canEdit={$isAdmin} className="price-badge"
                      onchange={(v) => updateSection(si, (s) => {
                        if (s.type !== 'pricing') return s;
                        return { ...s, options: s.options.map((o, i) => i === optI ? { ...o, label: v || undefined } : o) };
                      })} />
                  {/if}
                  <EditableText tag="span" value={option.period} canEdit={$isAdmin} className="price-period"
                    onchange={(v) => updateSection(si, (s) => {
                      if (s.type !== 'pricing') return s;
                      return { ...s, options: s.options.map((o, i) => i === optI ? { ...o, period: v } : o) };
                    })} />
                  <EditableText tag="span" value={option.price} canEdit={$isAdmin} className="price-value"
                    onchange={(v) => updateSection(si, (s) => {
                      if (s.type !== 'pricing') return s;
                      return { ...s, options: s.options.map((o, i) => i === optI ? { ...o, price: v } : o) };
                    })} />
                  <div class="price-features">
                    {#each option.features as feature, fI}
                      <div class="feature-row">
                        <EditableText tag="span" value={'• ' + feature} canEdit={$isAdmin}
                          onchange={(v) => updateSection(si, (s) => {
                            if (s.type !== 'pricing') return s;
                            const cleaned = v.replace(/^•\s*/, '');
                            return { ...s, options: s.options.map((o, i) => {
                              if (i !== optI) return o;
                              return { ...o, features: o.features.map((f, fi) => fi === fI ? cleaned : f) };
                            }) };
                          })} />
                        {#if $isAdmin}
                          <button class="control-btn" onclick={() =>
                            updateSection(si, (s) => {
                              if (s.type !== 'pricing') return s;
                              return { ...s, options: s.options.map((o, i) => {
                                if (i !== optI) return o;
                                const features = o.features.filter((_, fi) => fi !== fI);
                                return { ...o, features: features.length ? features : ['Новое преимущество'] };
                              }) };
                            })}>-</button>
                        {/if}
                      </div>
                    {/each}
                    {#if $isAdmin}
                      <button class="control-btn add-btn" onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'pricing') return s;
                          return { ...s, options: s.options.map((o, i) => i === optI ? { ...o, features: [...o.features, 'Новое преимущество'] } : o) };
                        })}>+</button>
                    {/if}
                  </div>
                  {#if $isAdmin}
                    <div class="inline-controls">
                      <button class="control-btn" onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'pricing') return s;
                          return { ...s, options: s.options.length === 1 ? [createEmptyPricingOption()] : s.options.filter((_, i) => i !== optI) };
                        })}>-</button>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
            {#if $isAdmin}
              <button class="control-btn add-card-btn" onclick={() =>
                updateSection(si, (s) => {
                  if (s.type !== 'pricing') return s;
                  return { ...s, options: [...s.options, createEmptyPricingOption()] };
                })}>+ Тариф</button>
            {/if}
          </section>

        <!-- ===== REGISTRATION ===== -->
        {:else if section.type === 'registration'}
          {@const sec = section as RegistrationSectionData}
          <section id={sec.id} class="section {sec.visible ? '' : 'section-hidden'}">
            {#if $isAdmin}
              <div class="section-admin-bar">
                <button class="control-btn" disabled={si === 0} onclick={() => moveSection(si, -1)}>&#9650;</button>
                <button class="control-btn" disabled={si === $siteContent.sections.length - 1} onclick={() => moveSection(si, 1)}>&#9660;</button>
                <button class="control-btn" onclick={() => toggleVisibility(si)}>
                  {sec.visible ? 'Скрыть раздел' : 'Показать раздел'}
                </button>
                <button class="control-btn" onclick={() => deleteSection(si)}>Удалить раздел</button>
              </div>
            {/if}
            <EditableText tag="h2" value={sec.heading} canEdit={$isAdmin} className="section-heading"
              onchange={(v) => updateSection(si, (s) => ({ ...s, heading: v }))} />
            <div class="registration-steps">
              {#each sec.steps as step, stepI}
                <div class="registration-step">
                  <div class="registration-step-header">
                    <span class="registration-step-number">{stepI + 1}</span>
                    <EditableText
                      tag="span"
                      value={step.text}
                      canEdit={$isAdmin}
                      className={step.emphasis ? 'registration-step-text-emphasis' : ''}
                      onchange={(v) =>
                        updateSection(si, (s) => {
                          if (s.type !== 'registration') return s;
                          return { ...s, steps: s.steps.map((st, i) => (i === stepI ? { ...st, text: v } : st)) };
                        })}
                    />
                  </div>
                  {#if $isAdmin}
                    <div class="inline-controls">
                      <button class="control-btn" onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'registration') return s;
                          const steps = s.steps.filter((_, i) => i !== stepI);
                          return { ...s, steps: steps.length ? steps : [{ text: 'Новый шаг' }] };
                        })}>-</button>
                    </div>
                  {/if}
                </div>
              {/each}
              {#if $isAdmin}
                <button class="control-btn add-btn" onclick={() =>
                  updateSection(si, (s) => {
                    if (s.type !== 'registration') return s;
                    return { ...s, steps: [...s.steps, { text: 'Новый шаг' }] };
                  })}>+ Шаг</button>
              {/if}
            </div>
            <div class="registration-btn-container">
              {#if $isAdmin}
                <EditableText tag="span" value={sec.buttonText} canEdit={true} className="registration-btn"
                  style={btnGradient(sec.buttonColor)}
                  onchange={(v) => updateSection(si, (s) => ({ ...s, buttonText: v }))} />
                <div class="btn-color-picker">
                  <input type="color" value={sec.buttonColor || $siteContent.primaryColor}
                    oninput={(e) => updateSection(si, (s) => ({ ...s, buttonColor: (e.target as HTMLInputElement).value }))} />
                  {#if sec.buttonColor}
                    <button class="btn-color-reset" onclick={() => updateSection(si, (s) => ({ ...s, buttonColor: undefined }))}>сброс</button>
                  {/if}
                </div>
                <div class="url-edit">
                  <input
                    type="text"
                    value={sec.buttonUrl}
                    placeholder="URL ссылки"
                    oninput={(e) => {
                      const val = (e.target as HTMLInputElement).value;
                      updateSection(si, (s) => ({ ...s, buttonUrl: val }));
                    }}
                  />
                </div>
              {:else}
                <a href={sec.buttonUrl} target="_blank" rel="noopener noreferrer" class="registration-btn"
                  style={btnGradient(sec.buttonColor)}>
                  {sec.buttonText}
                </a>
              {/if}
            </div>
            <div class="registration-notifications">
              <EditableText tag="h3" value={sec.notifications.title} canEdit={$isAdmin} className="registration-notifications-title"
                onchange={(v) => updateSection(si, (s) => {
                  if (s.type !== 'registration') return s;
                  return { ...s, notifications: { ...s.notifications, title: v } };
                })} />
              <div class="registration-notifications-list">
                {#each sec.notifications.items as item, itemI}
                  <div class="notification-row">
                    <EditableText tag="p" value={'• ' + item} canEdit={$isAdmin}
                      onchange={(v) => updateSection(si, (s) => {
                        if (s.type !== 'registration') return s;
                        const cleaned = v.replace(/^•\s*/, '');
                        return { ...s, notifications: { ...s.notifications, items: s.notifications.items.map((it, i) => i === itemI ? cleaned : it) } };
                      })} />
                    {#if $isAdmin}
                      <button class="control-btn" onclick={() =>
                        updateSection(si, (s) => {
                          if (s.type !== 'registration') return s;
                          const items = s.notifications.items.filter((_, i) => i !== itemI);
                          return { ...s, notifications: { ...s.notifications, items: items.length ? items : ['Новый пункт'] } };
                        })}>-</button>
                    {/if}
                  </div>
                {/each}
                {#if $isAdmin}
                  <button class="control-btn add-btn" onclick={() =>
                    updateSection(si, (s) => {
                      if (s.type !== 'registration') return s;
                      return { ...s, notifications: { ...s.notifications, items: [...s.notifications.items, 'Новый пункт'] } };
                    })}>+</button>
                {/if}
              </div>
            </div>
            <div class="contact-section">
              <EditableText tag="h3" value={sec.contact.title} canEdit={$isAdmin} className="contact-section-title"
                onchange={(v) => updateSection(si, (s) => {
                  if (s.type !== 'registration') return s;
                  return { ...s, contact: { ...s.contact, title: v } };
                })} />
              <div class="contact-info">
                <a
                  href={sec.contact.phone ? `tel:${sec.contact.phone.replace(/[^\d+]/g, '')}` : undefined}
                  class="contact-item contact-link"
                  onclick={(e) => { if ($isAdmin) e.preventDefault(); }}
                >
                  <EditableText tag="span" value={sec.contact.phone} canEdit={$isAdmin} className="contact-text contact-phone"
                    onchange={(v) => updateSection(si, (s) => {
                      if (s.type !== 'registration') return s;
                      return { ...s, contact: { ...s.contact, phone: v } };
                    })} />
                </a>
                <a
                  href={sec.contact.email ? `mailto:${sec.contact.email}` : undefined}
                  class="contact-item contact-link"
                  onclick={(e) => { if ($isAdmin) e.preventDefault(); }}
                >
                  <EditableText tag="span" value={sec.contact.email} canEdit={$isAdmin} className="contact-text contact-email"
                    onchange={(v) => updateSection(si, (s) => {
                      if (s.type !== 'registration') return s;
                      return { ...s, contact: { ...s.contact, email: v } };
                    })} />
                </a>
              </div>
            </div>
          </section>

        <!-- ===== TEXT ===== -->
        {:else if section.type === 'text'}
          {@const sec = section as TextSectionData}
          <section id={sec.id} class="section {sec.visible ? '' : 'section-hidden'}">
            {#if $isAdmin}
              <div class="section-admin-bar">
                <button class="control-btn" disabled={si === 0} onclick={() => moveSection(si, -1)}>&#9650;</button>
                <button class="control-btn" disabled={si === $siteContent.sections.length - 1} onclick={() => moveSection(si, 1)}>&#9660;</button>
                <button class="control-btn" onclick={() => toggleVisibility(si)}>
                  {sec.visible ? 'Скрыть раздел' : 'Показать раздел'}
                </button>
                <button class="control-btn" onclick={() => deleteSection(si)}>Удалить раздел</button>
              </div>
            {/if}
            <EditableText tag="h2" value={sec.heading} canEdit={$isAdmin} className="section-heading"
              onchange={(v) => updateSection(si, (s) => ({ ...s, heading: v }))} />
            <EditableText tag="div" value={sec.body} canEdit={$isAdmin} className="text-section-body"
              onchange={(v) => updateSection(si, (s) => {
                if (s.type !== 'text') return s;
                return { ...s, body: v };
              })} />
          </section>

        <!-- ===== ACCORDION ===== -->
        {:else if section.type === 'accordion'}
          {@const sec = section as AccordionSectionData}
          <section id={sec.id} class="section {sec.visible ? '' : 'section-hidden'}">
            {#if $isAdmin}
              <div class="section-admin-bar">
                <button class="control-btn" disabled={si === 0} onclick={() => moveSection(si, -1)}>&#9650;</button>
                <button class="control-btn" disabled={si === $siteContent.sections.length - 1} onclick={() => moveSection(si, 1)}>&#9660;</button>
                <button class="control-btn" onclick={() => toggleVisibility(si)}>
                  {sec.visible ? 'Скрыть раздел' : 'Показать раздел'}
                </button>
                <button class="control-btn" onclick={() => deleteSection(si)}>Удалить раздел</button>
              </div>
            {/if}
            <EditableText tag="h2" value={sec.heading} canEdit={$isAdmin} className="section-heading"
              onchange={(v) => updateSection(si, (s) => ({ ...s, heading: v }))} />
            <div class="accordion-list">
              {#each sec.items as item, itemI}
                <div class="accordion-item">
                  <button
                    type="button"
                    class="accordion-trigger"
                    onclick={(e) => {
                      const el = (e.currentTarget as HTMLElement).closest('.accordion-item');
                      el?.classList.toggle('open');
                    }}
                  >
                    {#if $isAdmin}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span class="accordion-title-edit" onclick={(e) => e.stopPropagation()}>
                        <EditableText tag="span" value={item.title} canEdit={true}
                          onchange={(v) => updateSection(si, (s) => {
                            if (s.type !== 'accordion') return s;
                            return { ...s, items: s.items.map((it, i) => i === itemI ? { ...it, title: v } : it) };
                          })} />
                      </span>
                    {:else}
                      <span class="accordion-title">{item.title}</span>
                    {/if}
                    <span class="accordion-arrow">&#9660;</span>
                  </button>
                  <div class="accordion-body">
                    <EditableText tag="div" value={item.body} canEdit={$isAdmin} className="accordion-body-text"
                      onchange={(v) => updateSection(si, (s) => {
                        if (s.type !== 'accordion') return s;
                        return { ...s, items: s.items.map((it, i) => i === itemI ? { ...it, body: v } : it) };
                      })} />
                    {#if $isAdmin}
                      <div class="inline-controls" style="margin-top:12px;">
                        <button class="control-btn" onclick={() =>
                          updateSection(si, (s) => {
                            if (s.type !== 'accordion') return s;
                            return { ...s, items: s.items.length === 1 ? [{ title: 'Заголовок', body: 'Текст блока' }] : s.items.filter((_, i) => i !== itemI) };
                          })}>- Удалить блок</button>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
              {#if $isAdmin}
                <button class="control-btn add-card-btn" onclick={() =>
                  updateSection(si, (s) => {
                    if (s.type !== 'accordion') return s;
                    return { ...s, items: [...s.items, { title: 'Заголовок', body: 'Текст блока' }] };
                  })}>+ Блок</button>
              {/if}
            </div>
          </section>
        {/if}
      {/if}
    {/each}

    <!-- ===== ADD SECTION ===== -->
    {#if $isAdmin}
      <div class="add-section-area">
        <span class="add-section-label">Добавить раздел:</span>
        <button class="control-btn" onclick={() => addSection('program')}>Программа</button>
        <button class="control-btn" onclick={() => addSection('speakers')}>Спикеры</button>
        <button class="control-btn" onclick={() => addSection('pricing')}>Цены</button>
        <button class="control-btn" onclick={() => addSection('registration')}>Регистрация</button>
        <button class="control-btn" onclick={() => addSection('text')}>Текст</button>
        <button class="control-btn" onclick={() => addSection('accordion')}>Аккордеон</button>
      </div>
    {/if}
  </div>

  <!-- ==================== FOOTER ==================== -->
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-content">
        <EditableText tag="p" value={$siteContent.footerText} canEdit={$isAdmin}
          onchange={(v) => updateContent((prev) => ({ ...prev, footerText: v }))} />
      </div>
      <div class="footer-actions">
        {#if $isAdmin}
          <div class="color-picker-wrapper">
            <label class="color-picker-label">
              Цвет темы
              <input
                type="color"
                value={$siteContent.primaryColor}
                oninput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  updateContent((prev) => ({ ...prev, primaryColor: val }));
                }}
              />
            </label>
          </div>
          <button type="button" class="login-btn" onclick={handleLogout}>Выйти</button>
        {:else}
          <button type="button" class="login-btn" onclick={handleOpenLogin}>
            Войти как администратор
          </button>
        {/if}
      </div>
      <EditableText tag="p" value={$siteContent.footerNote} canEdit={$isAdmin} className="footer-note"
        onchange={(v) => updateContent((prev) => ({ ...prev, footerNote: v }))} />
    </div>
  </footer>

  <!-- ==================== SESSION MODAL ==================== -->
  {#if sessionModal && sessionModalContent}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => sessionModal = null}>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="modal-content session-modal-content" onclick={(e) => e.stopPropagation()}>
        <button type="button" class="modal-close" onclick={() => sessionModal = null}>x</button>
        <EditableText tag="h3" value={sessionModalContent.modalTitle || sessionModalContent.title} canEdit={$isAdmin} className="modal-title"
          onchange={(v) => {
            const m = sessionModal!;
            updateSection(m.si, (s) => {
              if (s.type !== 'program') return s;
              return { ...s, days: s.days.map((d, di) => di === m.dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === m.sessionIndex ? { ...ss, modalTitle: v } : ss) } : d) };
            });
          }} />
        {#if sessionModalContent.modalIsList}
          <ul class="session-modal-list">
            {#each (sessionModalContent.modalBody || '').split('\n').filter(Boolean) as line, lineI}
              <li>
                {#if $isAdmin}
                  <EditableText tag="span" value={line} canEdit={true}
                    onchange={(v) => {
                      const m = sessionModal!;
                      const lines = (sessionModalContent!.modalBody || '').split('\n').filter(Boolean);
                      lines[lineI] = v;
                      updateSection(m.si, (s) => {
                        if (s.type !== 'program') return s;
                        return { ...s, days: s.days.map((d, di) => di === m.dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === m.sessionIndex ? { ...ss, modalBody: lines.join('\n') } : ss) } : d) };
                      });
                    }} />
                  <button class="control-btn" style="font-size:11px;padding:2px 6px;margin-left:4px;"
                    onclick={() => {
                      const m = sessionModal!;
                      const lines = (sessionModalContent!.modalBody || '').split('\n').filter(Boolean).filter((_, i) => i !== lineI);
                      updateSection(m.si, (s) => {
                        if (s.type !== 'program') return s;
                        return { ...s, days: s.days.map((d, di) => di === m.dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === m.sessionIndex ? { ...ss, modalBody: lines.length ? lines.join('\n') : 'Пункт' } : ss) } : d) };
                      });
                    }}>-</button>
                {:else}
                  {line}
                {/if}
              </li>
            {/each}
          </ul>
          {#if $isAdmin}
            <button class="control-btn add-btn" style="font-size:12px;padding:4px 10px;align-self:flex-start;"
              onclick={() => {
                const m = sessionModal!;
                const lines = (sessionModalContent!.modalBody || '').split('\n').filter(Boolean);
                lines.push('Новый пункт');
                updateSection(m.si, (s) => {
                  if (s.type !== 'program') return s;
                  return { ...s, days: s.days.map((d, di) => di === m.dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === m.sessionIndex ? { ...ss, modalBody: lines.join('\n') } : ss) } : d) };
                });
              }}>+ пункт</button>
          {/if}
        {:else}
          <EditableText tag="div" value={sessionModalContent.modalBody || sessionModalContent.description} canEdit={$isAdmin} className="session-modal-body"
            onchange={(v) => {
              const m = sessionModal!;
              updateSection(m.si, (s) => {
                if (s.type !== 'program') return s;
                return { ...s, days: s.days.map((d, di) => di === m.dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === m.sessionIndex ? { ...ss, modalBody: v } : ss) } : d) };
              });
            }} />
        {/if}
        {#if $isAdmin}
          <label class="hero-detail-list-toggle" style="margin-top:8px;">
            <input type="checkbox" checked={sessionModalContent.modalIsList || false}
              onchange={(e) => {
                const checked = (e.target as HTMLInputElement).checked;
                const m = sessionModal!;
                updateSection(m.si, (s) => {
                  if (s.type !== 'program') return s;
                  return { ...s, days: s.days.map((d, di) => di === m.dayIndex ? { ...d, sessions: d.sessions.map((ss, ssi) => ssi === m.sessionIndex ? { ...ss, modalIsList: checked } : ss) } : d) };
                });
              }} />
            список
          </label>
        {/if}
      </div>
    </div>
  {/if}

  <!-- ==================== LOGIN MODAL ==================== -->
  {#if isLoginModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={handleCloseLogin}>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <button type="button" class="modal-close" onclick={handleCloseLogin}>x</button>
        <h3 class="modal-title">Вход администратора</h3>
        <form class="modal-form" onsubmit={handleLoginSubmit}>
          <label class="modal-label">
            Логин
            <input type="text" class="modal-input" bind:value={loginField} />
          </label>
          <label class="modal-label">
            Пароль
            <input type="password" class="modal-input" bind:value={passwordField} />
          </label>
          {#if loginError}
            <div class="modal-error">{loginError}</div>
          {/if}
          <button type="submit" class="modal-submit">Войти</button>
        </form>
      </div>
    </div>
  {/if}

  <!-- ==================== TOAST ==================== -->
  {#if $contentStatus !== 'idle'}
    <div class="toast">
      {#if $contentStatus === 'loading'}Загрузка данных...{/if}
      {#if $contentStatus === 'saving'}Сохранение...{/if}
      {#if $contentStatus === 'error'}{$contentError ?? 'Произошла ошибка'}{/if}
    </div>
  {/if}
</div>
