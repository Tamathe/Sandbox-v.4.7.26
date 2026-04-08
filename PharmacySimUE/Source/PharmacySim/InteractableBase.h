#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "InteractableBase.generated.h"

class APharmacyPlayerController;

/**
 * Base class for all interactable objects in the pharmacy.
 * Subclass this for counters, shelves, medication bottles, NPCs, etc.
 */
UCLASS(Abstract)
class PHARMACYSIM_API AInteractableBase : public AActor
{
	GENERATED_BODY()

public:
	AInteractableBase();

	// Display name shown in the HUD when focused
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
	FText InteractionPrompt;

	// Whether this object can currently be interacted with
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
	bool bCanInteract = true;

	// Called when the player interacts with this object
	UFUNCTION(BlueprintNativeEvent, Category = "Interaction")
	void OnInteract(APharmacyPlayerController* Controller);
	virtual void OnInteract_Implementation(APharmacyPlayerController* Controller);

	// Called when the player's crosshair enters/exits this object
	UFUNCTION(BlueprintNativeEvent, Category = "Interaction")
	void OnFocusBegin();
	virtual void OnFocusBegin_Implementation();

	UFUNCTION(BlueprintNativeEvent, Category = "Interaction")
	void OnFocusEnd();
	virtual void OnFocusEnd_Implementation();

protected:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	UStaticMeshComponent* MeshComponent;
};
