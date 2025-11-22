defmodule CheckSplitter.Check do
  @moduledoc """
  Represents a check/bill to be split among multiple people.
  """

  defstruct [
    :id,
    :share_code,
    :owner_name,
    :tip_amount,
    items: [],
    participants: %{},
    inserted_at: nil
  ]

  @type t :: %__MODULE__{
          id: String.t(),
          share_code: String.t(),
          owner_name: String.t(),
          tip_amount: Decimal.t() | nil,
          items: [CheckSplitter.LineItem.t()],
          participants: %{String.t() => String.t()},
          inserted_at: DateTime.t()
        }

  @doc """
  Creates a new check with a unique share code.
  """
  def new(owner_name) do
    now = DateTime.utc_now()

    %__MODULE__{
      id: generate_id(),
      share_code: generate_share_code(),
      owner_name: owner_name,
      tip_amount: Decimal.new(0),
      items: [],
      participants: %{generate_participant_id() => owner_name},
      inserted_at: now
    }
  end

  @doc """
  Adds a participant to the check.
  """
  def add_participant(%__MODULE__{} = check, name) do
    participant_id = generate_participant_id()
    participants = Map.put(check.participants, participant_id, name)
    %{check | participants: participants}
  end

  @doc """
  Adds a line item to the check.
  """
  def add_item(%__MODULE__{} = check, description, price) do
    item = CheckSplitter.LineItem.new(description, price)
    %{check | items: check.items ++ [item]}
  end

  @doc """
  Sets multiple items (useful for OCR parsing).
  """
  def set_items(%__MODULE__{} = check, items) do
    %{check | items: items}
  end

  @doc """
  Claims an item for a participant.
  """
  def claim_item(%__MODULE__{} = check, item_id, participant_id) do
    items =
      Enum.map(check.items, fn item ->
        if item.id == item_id do
          CheckSplitter.LineItem.add_claimer(item, participant_id)
        else
          item
        end
      end)

    %{check | items: items}
  end

  @doc """
  Unclaims an item for a participant.
  """
  def unclaim_item(%__MODULE__{} = check, item_id, participant_id) do
    items =
      Enum.map(check.items, fn item ->
        if item.id == item_id do
          CheckSplitter.LineItem.remove_claimer(item, participant_id)
        else
          item
        end
      end)

    %{check | items: items}
  end

  @doc """
  Sets the tip amount.
  """
  def set_tip(%__MODULE__{} = check, amount) do
    %{check | tip_amount: Decimal.new(amount)}
  end

  @doc """
  Calculates what each participant owes.
  """
  def calculate_totals(%__MODULE__{} = check) do
    # Calculate subtotal and per-person amounts
    participant_ids = Map.keys(check.participants)

    # Initialize totals for each participant
    totals =
      Enum.reduce(participant_ids, %{}, fn pid, acc ->
        Map.put(acc, pid, Decimal.new(0))
      end)

    # Add up each person's share of claimed items
    totals_with_items =
      Enum.reduce(check.items, totals, fn item, acc ->
        if Enum.empty?(item.claimed_by) do
          acc
        else
          # Split the item cost among all claimers
          share = Decimal.div(item.price, Decimal.new(length(item.claimed_by)))

          Enum.reduce(item.claimed_by, acc, fn claimer_id, inner_acc ->
            current = Map.get(inner_acc, claimer_id, Decimal.new(0))
            Map.put(inner_acc, claimer_id, Decimal.add(current, share))
          end)
        end
      end)

    # Calculate tip per person (split equally)
    tip_per_person =
      if Decimal.compare(check.tip_amount, Decimal.new(0)) == :gt do
        Decimal.div(check.tip_amount, Decimal.new(map_size(check.participants)))
      else
        Decimal.new(0)
      end

    # Add tip to each person's total
    Enum.reduce(totals_with_items, %{}, fn {pid, subtotal}, acc ->
      total = Decimal.add(subtotal, tip_per_person)
      name = Map.get(check.participants, pid, "Unknown")
      Map.put(acc, pid, %{name: name, subtotal: subtotal, tip: tip_per_person, total: total})
    end)
  end

  defp generate_id do
    Nanoid.generate()
  end

  defp generate_share_code do
    # Generate a 6-character uppercase code
    Nanoid.generate(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
  end

  defp generate_participant_id do
    Nanoid.generate(8)
  end
end
