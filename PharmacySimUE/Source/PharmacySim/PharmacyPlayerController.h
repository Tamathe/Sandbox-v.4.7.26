#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "PharmacyPlayerController.generated.h"

class AInteractableBase;

/**
 * First-person player controller for the pharmacy simulation.
 * Handles interaction raycasting and input.
 */
UCLASS()
class PHARMACYSIM_API APharmacyPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	APharmacyPlayerController();

	virtual void SetupInputComponent() override;
	virtual void Tick(float DeltaTime) override;

	// Interaction range for picking up items / talking to NPCs
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
	float InteractionRange = 300.f;

	// Currently focused interactable (what the crosshair is on)
	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	AInteractableBase* FocusedInteractable;

	// Interact with the focused object
	UFUNCTION(BlueprintCallable, Category = "Interaction")
	void Interact();

	// Events
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnInteractableFocused, AInteractableBase*, Interactable);
	DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnInteractableLost);

	UPROPERTY(BlueprintAssignable, Category = "Interaction")
	FOnInteractableFocused OnInteractableFocused;

	UPROPERTY(BlueprintAssignable, Category = "Interaction")
	FOnInteractableLost OnInteractableLost;

protected:
	virtual void BeginPlay() override;

private:
	void PerformInteractionTrace();
};
