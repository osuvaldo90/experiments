defmodule CheckSplitter.LineItem do
  @moduledoc """
  Represents a single line item on a check.
  """

  defstruct [:id, :description, :price, claimed_by: []]

  @type t :: %__MODULE__{
          id: String.t(),
          description: String.t(),
          price: Decimal.t(),
          claimed_by: [String.t()]
        }

  @doc """
  Creates a new line item.
  """
  def new(description, price) when is_binary(description) do
    %__MODULE__{
      id: Nanoid.generate(),
      description: description,
      price: parse_price(price),
      claimed_by: []
    }
  end

  @doc """
  Adds a claimer to the item.
  """
  def add_claimer(%__MODULE__{} = item, participant_id) do
    if participant_id in item.claimed_by do
      item
    else
      %{item | claimed_by: item.claimed_by ++ [participant_id]}
    end
  end

  @doc """
  Removes a claimer from the item.
  """
  def remove_claimer(%__MODULE__{} = item, participant_id) do
    %{item | claimed_by: List.delete(item.claimed_by, participant_id)}
  end

  defp parse_price(price) when is_binary(price) do
    # Remove currency symbols and parse
    price
    |> String.replace(~r/[^\d.]/, "")
    |> Decimal.new()
  end

  defp parse_price(price) when is_number(price) do
    Decimal.new(price)
  end

  defp parse_price(%Decimal{} = price), do: price
end
