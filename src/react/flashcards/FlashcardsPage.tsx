import FlashcardsContent from "./components/FlashcardsContent";
import FlashcardsLayout from "./components/FlashcardsLayout";
import FlashcardsTopbar from "./components/FlashcardsTopbar";
import DeleteFlashcardConfirmModal from "./components/DeleteFlashcardConfirmModal";
import FlashcardFormModal from "./components/FlashcardFormModal";
import FlashcardsToastStack from "./components/FlashcardsToastStack";
import useFlashcardsView from "./useFlashcardsView";

import "./flashcards.css";

export default function FlashcardsPage(): JSX.Element {
  const {
    state,
    actions: {
      openCreateModal,
      openEditModal,
      closeFormModal,
      submitForm,
      openDeleteModal,
      closeDeleteModal,
      confirmDelete,
      retryLoading,
      goToGenerator,
      dismissToast,
    },
  } = useFlashcardsView();

  return (
    <div
      data-testid="flashcards-page"
      className="flashcards-page flex flex-col text-foreground"
    >
      <FlashcardsTopbar activeHref="/app/flashcards" />

      <main className="flex-1 px-4 py-6 md:px-10" role="main">
        <FlashcardsLayout
          isAddDisabled={state.isCategoriesLoading || state.isFormModalOpen}
          onAddFlashcard={openCreateModal}
          content={
            <FlashcardsContent
              items={state.items}
              isLoading={state.isLoading}
              error={state.error}
              onRetry={retryLoading}
              onAddClick={openCreateModal}
              onGoToGenerator={goToGenerator}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              pendingEditId={state.rowUpdatingId}
              pendingDeleteId={state.rowDeletingId}
            />
          }
        />
      </main>

      <FlashcardFormModal
        isOpen={state.isFormModalOpen}
        mode={state.formMode}
        categories={state.categories}
        categoriesLoading={state.isCategoriesLoading}
        initialValues={state.formInitialValues}
        isSubmitting={state.isFormSubmitting}
        onSubmit={submitForm}
        onCancel={closeFormModal}
      />

      <DeleteFlashcardConfirmModal
        isOpen={state.isDeleteModalOpen}
        frontPreview={state.deleteFrontPreview ?? undefined}
        isDeleting={state.isDeleteSubmitting}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
      />

      <FlashcardsToastStack toasts={state.toasts} onDismiss={dismissToast} />
    </div>
  );
}
