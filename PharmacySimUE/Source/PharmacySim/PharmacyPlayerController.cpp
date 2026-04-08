#include "PharmacyPlayerController.h"
#include "InteractableBase.h"
#include "PharmacySim.h"
#include "Engine/World.h"

APharmacyPlayerController::APharmacyPlayerController()
{
	PrimaryActorTick.bCanEverTick = true;
	FocusedInteractable = nullptr;
}

void APharmacyPlayerController::BeginPlay()
{
	Super::BeginPlay();
	bShowMouseCursor = false;
}

void APharmacyPlayerController::SetupInputComponent()
{
	Super::SetupInputComponent();

	InputComponent->BindAction("Interact", IE_Pressed, this, &APharmacyPlayerController::Interact);
}

void APharmacyPlayerController::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
	PerformInteractionTrace();
}

void APharmacyPlayerController::PerformInteractionTrace()
{
	FVector CameraLocation;
	FRotator CameraRotation;
	GetPlayerViewPoint(CameraLocation, CameraRotation);

	FVector TraceEnd = CameraLocation + (CameraRotation.Vector() * InteractionRange);

	FHitResult HitResult;
	FCollisionQueryParams QueryParams;
	QueryParams.AddIgnoredActor(GetPawn());

	bool bHit = GetWorld()->LineTraceSingleByChannel(
		HitResult, CameraLocation, TraceEnd, ECC_Visibility, QueryParams);

	AInteractableBase* HitInteractable = nullptr;
	if (bHit)
	{
		HitInteractable = Cast<AInteractableBase>(HitResult.GetActor());
	}

	if (HitInteractable != FocusedInteractable)
	{
		if (FocusedInteractable)
		{
			OnInteractableLost.Broadcast();
		}

		FocusedInteractable = HitInteractable;

		if (FocusedInteractable)
		{
			OnInteractableFocused.Broadcast(FocusedInteractable);
		}
	}
}

void APharmacyPlayerController::Interact()
{
	if (FocusedInteractable)
	{
		FocusedInteractable->OnInteract(this);
		UE_LOG(LogPharmacySim, Log, TEXT("Interacted with: %s"), *FocusedInteractable->GetName());
	}
}
