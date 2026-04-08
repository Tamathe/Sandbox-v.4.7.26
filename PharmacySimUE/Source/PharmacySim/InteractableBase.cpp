#include "InteractableBase.h"
#include "PharmacySim.h"

AInteractableBase::AInteractableBase()
{
	PrimaryActorTick.bCanEverTick = false;

	MeshComponent = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	RootComponent = MeshComponent;

	InteractionPrompt = FText::FromString(TEXT("Interact"));
}

void AInteractableBase::OnInteract_Implementation(APharmacyPlayerController* Controller)
{
	UE_LOG(LogPharmacySim, Log, TEXT("Base interact on: %s"), *GetName());
}

void AInteractableBase::OnFocusBegin_Implementation()
{
	// Highlight effect - override in subclasses or Blueprints
}

void AInteractableBase::OnFocusEnd_Implementation()
{
	// Remove highlight - override in subclasses or Blueprints
}
