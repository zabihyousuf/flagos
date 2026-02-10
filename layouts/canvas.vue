<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <!-- Sidebar is still visible but content area has no padding -->
    <AppSidebar />
    <div class="flex flex-col flex-1 w-full h-full overflow-hidden relative">
      <main class="w-full h-full relative p-0 overflow-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>
