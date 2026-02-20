<template>
  <div class="app-container">
    <TitleBar />
    <MenuBar />
    <ToolBar />
    <MainContent />
    <StatusBar />

    <!-- Dialogs -->
    <CreateWorkareaDialog />
    <ImportFileDialog />
    <DataManageDialog />
    <WellListDialog />
    <WellCurveWindow />
  </div>
</template>

<script setup lang="ts">
import TitleBar from '@/components/layout/TitleBar.vue'
import MenuBar from '@/components/layout/MenuBar.vue'
import ToolBar from '@/components/layout/ToolBar.vue'
import MainContent from '@/components/layout/MainContent.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import CreateWorkareaDialog from '@/components/dialogs/CreateWorkareaDialog.vue'
import ImportFileDialog from '@/components/dialogs/ImportFileDialog.vue'
import DataManageDialog from '@/components/dialogs/DataManageDialog.vue'
import WellListDialog from '@/components/dialogs/WellListDialog.vue'
import WellCurveWindow from '@/components/dialogs/WellCurveWindow.vue'
</script>

<style scoped lang="scss">
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
